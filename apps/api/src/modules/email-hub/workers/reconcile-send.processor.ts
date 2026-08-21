import { Inject, Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';

@Injectable()
export class ReconcileSendProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    @Inject(OutboxRepository) private readonly outbox: Pick<OutboxRepository, 'append'>,
  ) {}

  async handle(payload: QueuePayload): Promise<void> {
    const messageId = typeof payload.entityId === 'string' ? payload.entityId : undefined;
    if (!messageId || !this.provider.findByClientReference) return;
    const message = await this.repository.findMessageForSend(messageId);
    if (!message || message.status !== 'RECONCILING') return;
    let result;
    try {
      result = await this.provider.findByClientReference(`cms-email:${message.id}`);
    } catch {
      // A failed lookup is not evidence that the provider rejected the send. Keep RECONCILING.
      return;
    }
    await this.repository.withTransaction(async (repository, transaction) => {
      if (result) {
        if (!(await repository.markReconciledSent(message.id, result))) return;
        await this.outbox.append(transaction, {
          eventType: 'email.sent',
          aggregateType: 'EMAIL_MESSAGE',
          aggregateId: message.id,
          idempotencyKey: `email.sent.reconciled:${message.id}:${payload.eventId}`,
          correlationId: payload.correlationId,
          payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId, reconciled: true },
        });
        return;
      }
      if (!(await repository.markSendState(message.id, 'RECONCILING', 'RETRY_WAIT'))) return;
      await this.outbox.append(transaction, {
        eventType: 'email.send.retry_wait',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: message.id,
        idempotencyKey: `email.send.retry_wait.reconciled:${message.id}:${payload.eventId}`,
        correlationId: payload.correlationId,
        payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId, reconciled: true },
      });
    });
  }
}
