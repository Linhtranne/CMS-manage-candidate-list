import { Inject, Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';

const AUTH_FAILURE = /AUTH|CREDENTIAL|TOKEN|UNAUTHORIZED|FORBIDDEN|ACCESS_DENIED/i;

function safeProviderErrorCode(error: unknown): string {
  const candidate = error as { code?: unknown };
  if (typeof candidate.code === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{1,119}$/.test(candidate.code)) return candidate.code.toUpperCase();
  if (error instanceof Error && AUTH_FAILURE.test(error.message)) return 'MAIL_PROVIDER_AUTH_FAILURE';
  return 'MAIL_SUBSCRIPTION_RENEWAL_FAILED';
}

@Injectable()
export class RenewMailSubscriptionProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    private readonly outbox: OutboxRepository,
  ) {}

  async handle(payload: QueuePayload): Promise<void> {
    const mailboxId = typeof payload.entityId === 'string' ? payload.entityId : undefined;
    if (!mailboxId) return;
    const mailbox = await this.repository.findMailbox(mailboxId);
    if (!mailbox?.providerSubscriptionId || !['HEALTHY', 'DEGRADED'].includes(mailbox.status)) return;

    if (!this.provider.renewSubscription) {
      await this.recordFailure(mailboxId, payload, 'MAIL_PROVIDER_SUBSCRIPTION_UNSUPPORTED', 'DEGRADED');
      return;
    }

    try {
      const renewed = await this.provider.renewSubscription(mailbox.providerSubscriptionId);
      if (!renewed.subscriptionId.trim() || Number.isNaN(renewed.expiresAt.getTime()) || renewed.expiresAt <= new Date()) {
        await this.recordFailure(mailboxId, payload, 'MAIL_PROVIDER_SUBSCRIPTION_INVALID_RESPONSE', 'DEGRADED');
        return;
      }
      await this.repository.withTransaction(async (repository, transaction) => {
        const changed = await repository.markSubscriptionRenewed(mailboxId, renewed);
        if (changed.count !== 1) return;
        await this.outbox.append(transaction, {
          eventType: 'mail.subscription.renewed',
          aggregateType: 'MAILBOX',
          aggregateId: mailboxId,
          idempotencyKey: `mail-subscription-renewed:${mailboxId}:${renewed.expiresAt.toISOString()}`,
          correlationId: payload.correlationId,
          payload: { mailboxId, expiresAt: renewed.expiresAt.toISOString() },
        });
      });
    } catch (error) {
      const code = safeProviderErrorCode(error);
      await this.recordFailure(mailboxId, payload, code, AUTH_FAILURE.test(code) ? 'PAUSED_AUTH' : 'DEGRADED');
    }
  }

  private async recordFailure(mailboxId: string, payload: QueuePayload, code: string, status: 'DEGRADED' | 'PAUSED_AUTH'): Promise<void> {
    await this.repository.withTransaction(async (repository, transaction) => {
      await repository.markSubscriptionRenewalFailure(mailboxId, status);
      await this.outbox.append(transaction, {
        eventType: 'mail.subscription.renewal.failed',
        aggregateType: 'MAILBOX',
        aggregateId: mailboxId,
        idempotencyKey: `mail-subscription-renewal-failed:${mailboxId}:${payload.eventId}`,
        correlationId: payload.correlationId,
        payload: { mailboxId, reason: code, status },
      });
    });
  }
}
