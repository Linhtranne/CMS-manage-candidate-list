import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { IdempotencyService } from './idempotency/idempotency.service.js';
import { CommandTransactionService } from './transaction/command-transaction.service.js';
import { AuditWriter } from '../modules/audit/audit-writer.js';
import {
  OUTBOX_PUBLISHER,
  OutboxDispatcher,
  type OutboxDispatchMessage,
  type OutboxPublisher,
} from './outbox/outbox.dispatcher.js';
import { OutboxRepository } from './outbox/outbox.repository.js';
import { QueueModule } from './queue/queue.module.js';
import { QueueService } from './queue/queue.service.js';
import { redactStructuredValue } from './security/redaction.js';

export function createQueueOutboxPublisher(
  queue: Pick<QueueService, 'enabled' | 'enqueue'>,
): OutboxPublisher {
  return {
    publish: async (event: OutboxDispatchMessage) => {
      if (!queue.enabled) throw new Error('QUEUE_DISABLED');
      const eventPayload = event.payload && typeof event.payload === 'object'
        ? redactStructuredValue(event.payload) as Record<string, unknown>
        : {};
      const queueName = event.eventType === 'email.send.uncertain'
        ? 'reconcile'
        : event.eventType === 'file.scan.requested' || event.eventType === 'document.candidate.created'
          ? 'file-scan'
          : 'outbox';
      await queue.enqueue(queueName, {
        ...eventPayload,
        schemaVersion: event.schemaVersion,
        eventId: event.id,
        correlationId: typeof event.payload === 'object' && event.payload && 'correlationId' in event.payload
          ? String((event.payload as { correlationId: unknown }).correlationId) : event.id,
        entityId: event.aggregateId,
        eventType: event.eventType,
        idempotencyKey: event.idempotencyKey,
        payload: eventPayload,
      });
    },
  };
}

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [
    IdempotencyService,
    CommandTransactionService,
    AuditWriter,
    OutboxRepository,
    OutboxDispatcher,
    {
      provide: OUTBOX_PUBLISHER,
      inject: [QueueService],
      useFactory: createQueueOutboxPublisher,
    },
  ],
  exports: [IdempotencyService, CommandTransactionService, AuditWriter, OutboxRepository, OutboxDispatcher],
})
export class CommandPlatformModule {}
