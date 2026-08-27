import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

const SUPPORTED_SCHEMA_VERSION = 1;
const MAX_ATTEMPTS = 5;
export const OUTBOX_PUBLISHER = Symbol('OUTBOX_PUBLISHER');

export interface OutboxDispatchMessage {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  schemaVersion: number;
  payload: unknown;
  attempts: number;
}

export interface OutboxPublisher {
  publish(event: OutboxDispatchMessage): Promise<void>;
}

interface ClaimedRow {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  schema_version: number;
  payload: unknown;
  attempts: number;
}

@Injectable()
export class OutboxDispatcher {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_PUBLISHER) private readonly publisher: OutboxPublisher,
  ) {}

  async dispatchBatch(limit = 25, transaction?: Prisma.TransactionClient): Promise<number> {
    const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 100)) : 25;
    if (transaction) return this.dispatchBatchInTransaction(transaction, boundedLimit);
    return this.prisma.$transaction((tx) => this.dispatchBatchInTransaction(tx, boundedLimit));
  }

  private async dispatchBatchInTransaction(tx: Prisma.TransactionClient, boundedLimit: number): Promise<number> {
    const claimed = await tx.$queryRaw<ClaimedRow[]>`
        SELECT id, event_type, aggregate_type, aggregate_id, idempotency_key,
               schema_version, payload, attempts
        FROM outbox_events
        WHERE state IN ('PENDING', 'RETRY')
          AND available_at <= NOW()
        ORDER BY created_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT ${boundedLimit}
      `;
    for (const row of claimed) {
      await tx.outboxEvent.update({
        where: { id: row.id },
        data: { state: 'PROCESSING', attempts: { increment: 1 }, lockedAt: new Date() },
      });
    }

    for (const row of claimed) {
      const event: OutboxDispatchMessage = {
        id: row.id,
        eventType: row.event_type,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        idempotencyKey: row.idempotency_key,
        schemaVersion: row.schema_version,
        payload: row.payload,
        attempts: row.attempts + 1,
      };
      if (event.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { state: 'DEAD', lastError: 'OUTBOX_SCHEMA_VERSION_UNSUPPORTED' },
        });
        continue;
      }
      try {
        await this.publisher.publish(event);
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { state: 'COMPLETED', publishedAt: new Date(), lastError: null, lockedAt: null },
        });
      } catch {
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: {
            state: event.attempts >= MAX_ATTEMPTS ? 'DEAD' : 'RETRY',
            availableAt: new Date(),
            lastError: 'OUTBOX_DISPATCH_FAILED',
            lockedAt: null,
          },
        });
      }
    }
    return claimed.length;
  }
}
