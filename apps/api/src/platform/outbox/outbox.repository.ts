import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { redactStructuredValue } from '../security/redaction.js';

export interface OutboxEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  correlationId: string;
  schemaVersion?: number;
  payload: Record<string, unknown>;
  availableAt?: Date;
}

@Injectable()
export class OutboxRepository {
  async append(tx: Prisma.TransactionClient, event: OutboxEventInput) {
    const schemaVersion = event.schemaVersion ?? 1;
    const payload = redactStructuredValue({
      ...event.payload,
      schemaVersion,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
    }) as Prisma.InputJsonValue;
    return tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        idempotencyKey: event.idempotencyKey,
        schemaVersion,
        payload,
        ...(event.availableAt ? { availableAt: event.availableAt } : {}),
      },
    });
  }
}
