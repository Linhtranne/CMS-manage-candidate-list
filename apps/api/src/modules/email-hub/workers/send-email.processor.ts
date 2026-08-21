import { Inject, Injectable, Optional } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import type { EmailMessageStatus } from '../domain/email.types.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { TelemetryService } from '../../../platform/telemetry/telemetry.service.js';

export type SendFailureDisposition = Extract<EmailMessageStatus, 'RETRY_WAIT' | 'RECONCILING' | 'FAILED'>;

export function classifySendFailure(error: unknown): SendFailureDisposition {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = String(candidate?.code ?? '').toUpperCase();
  const message = String(candidate?.message ?? error).toUpperCase();
  if (/TIMEOUT|CONNECTION_RESET|ECONNRESET|UNKNOWN_OUTCOME|AFTER REQUEST|NO RESPONSE/.test(code) || /TIMEOUT|CONNECTION RESET|AFTER REQUEST ACCEPTED|UNKNOWN OUTCOME/.test(message)) {
    return 'RECONCILING';
  }
  if (/RATE_LIMIT|HTTP_429|TEMPORARY|TRANSIENT|HTTP_5\d\d|ECONNREFUSED|NETWORK/.test(code) || /\b429\b|\b5\d\d\b|TEMPORARY|TRANSIENT/.test(message)) {
    return 'RETRY_WAIT';
  }
  return 'FAILED';
}

interface OutboundQueuePayload extends QueuePayload {
  eventType?: string;
  messageId?: string;
}

@Injectable()
export class SendEmailProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    @Inject(OutboxRepository) private readonly deliveryEvents: Pick<OutboxRepository, 'append'>,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {}

  async handle(payload: OutboundQueuePayload): Promise<void> {
    const messageId = payload.messageId ?? payload.entityId;
    if (!messageId) return;
    const message = await this.repository.findMessageForSend(messageId);
    if (!message || !['QUEUED', 'RETRY_WAIT'].includes(message.status)) return;
    if (!['HEALTHY', 'DEGRADED'].includes(message.mailbox.status)) {
      this.telemetry?.increment('email.send.kill_switch');
      return;
    }
    if (message.conversation.candidate?.contactabilityStatus === 'DO_NOT_CONTACT') {
      await this.repository.cancelBeforeSend(message.id);
      this.telemetry?.increment('email.send.do_not_contact');
      return;
    }
    if (!(await this.repository.claimForSend(messageId))) return;

    try {
      const recipients = message.recipients
        .filter((recipient) => recipient.kind === 'TO' || recipient.kind === 'CC' || recipient.kind === 'BCC')
        .sort((left, right) => left.position - right.position);
      const result = await this.provider.send({
        from: message.fromAddress,
        to: recipients.filter((recipient) => recipient.kind === 'TO').map((recipient) => recipient.address),
        cc: recipients.filter((recipient) => recipient.kind === 'CC').map((recipient) => recipient.address),
        bcc: recipients.filter((recipient) => recipient.kind === 'BCC').map((recipient) => recipient.address),
        subject: message.subject,
        bodyText: message.bodyText,
        ...(message.sanitizedHtml ? { sanitizedHtml: message.sanitizedHtml } : {}),
        headers: { 'X-CMS-Message-Id': message.id },
      }, `cms-email:${message.id}`);
      await this.repository.withTransaction(async (repository, transaction) => {
        if (!(await repository.markSent(message.id, result))) throw new Error('EMAIL_MESSAGE_VERSION_CONFLICT');
        await this.deliveryEvents.append(transaction, {
          eventType: 'email.sent',
          aggregateType: 'EMAIL_MESSAGE',
          aggregateId: message.id,
          idempotencyKey: `email.sent:${message.id}:${payload.eventId}`,
          correlationId: payload.correlationId,
          payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId },
        });
      });
      this.telemetry?.increment('email.send.success');
    } catch (error) {
      const disposition = classifySendFailure(error);
      const previousAttempt = typeof payload.attempt === 'number' && Number.isFinite(payload.attempt) ? payload.attempt : 0;
      const attempt = previousAttempt + 1;
      const effectiveDisposition: SendFailureDisposition = disposition === 'RETRY_WAIT' && attempt >= 8 ? 'FAILED' : disposition;
      if (isAuthFailure(error)) {
        await this.repository.pauseMailboxAuth(message.mailboxId);
        this.telemetry?.increment('email.mailbox.auth_pause');
        console.error(JSON.stringify({ event: 'email_mailbox_auth_paused', mailboxId: message.mailboxId, code: 'AUTH_INVALID' }));
      }
      await this.repository.withTransaction(async (repository, transaction) => {
        if (!(await repository.markSendState(message.id, 'SENDING', effectiveDisposition))) return;
        await this.deliveryEvents.append(transaction, {
          eventType: effectiveDisposition === 'RECONCILING' ? 'email.send.uncertain' : effectiveDisposition === 'RETRY_WAIT' ? 'email.send.retry_wait' : 'email.failed',
          aggregateType: 'EMAIL_MESSAGE',
          aggregateId: message.id,
          idempotencyKey: `email.${effectiveDisposition.toLowerCase()}:${message.id}:${payload.eventId}`,
          correlationId: payload.correlationId,
          ...(effectiveDisposition === 'RETRY_WAIT' ? { availableAt: new Date(Date.now() + Math.min(24 * 60 * 60 * 1000, 30_000 * (2 ** Math.min(attempt - 1, 7)))) } : {}),
          payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId, disposition: effectiveDisposition, attempt },
        });
      });
      this.telemetry?.increment(`email.send.${effectiveDisposition.toLowerCase()}`);
    }
  }

  async handleOutbox(payload: OutboundQueuePayload): Promise<void> {
    if (payload.eventType !== 'email.send.requested' && payload.eventType !== 'email.send.retry_wait') return;
    await this.handle(payload);
  }
}

function isAuthFailure(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown };
  return /AUTH|CREDENTIAL|UNAUTHORIZED|FORBIDDEN/.test(`${String(candidate?.code ?? '')} ${String(candidate?.message ?? '')}`.toUpperCase());
}
