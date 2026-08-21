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

export function createQueueOutboxPublisher(
  queue: Pick<QueueService, 'enabled' | 'enqueue'>,
): OutboxPublisher {
  return {
    publish: async (event: OutboxDispatchMessage) => {
      if (!queue.enabled) throw new Error('QUEUE_DISABLED');
      await queue.enqueue('outbox', {
        schemaVersion: event.schemaVersion,
        eventId: event.id,
        correlationId: typeof event.payload === 'object' && event.payload && 'correlationId' in event.payload
          ? String((event.payload as { correlationId: unknown }).correlationId) : event.id,
        entityId: event.aggregateId,
        idempotencyKey: event.idempotencyKey,
        payload: event.payload,
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
