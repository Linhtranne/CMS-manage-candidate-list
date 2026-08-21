import { describe, expect, it } from 'vitest';
import { createQueueOutboxPublisher } from '../../src/platform/command-platform.module.js';

describe('queue-backed outbox publisher', () => {
  it('keeps an outbox event retryable when queue transport is disabled', async () => {
    const publisher = createQueueOutboxPublisher({
      enabled: false,
      enqueue: async () => undefined,
    });

    await expect(publisher.publish({
      id: 'event-1',
      eventType: 'candidate.created',
      aggregateType: 'Candidate',
      aggregateId: 'candidate-1',
      idempotencyKey: 'idempotency-1',
      schemaVersion: 1,
      payload: { correlationId: 'correlation-1' },
      attempts: 1,
    })).rejects.toThrow('QUEUE_DISABLED');
  });
});
