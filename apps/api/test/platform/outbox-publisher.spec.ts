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

  it('routes uncertain email sends to reconciliation without copying message content', async () => {
    const calls: unknown[] = [];
    const publisher = createQueueOutboxPublisher({
      enabled: true,
      enqueue: async (...args: unknown[]) => { calls.push(args); },
    });
    await publisher.publish({
      id: 'event-uncertain',
      eventType: 'email.send.uncertain',
      aggregateType: 'EMAIL_MESSAGE',
      aggregateId: 'message-1',
      idempotencyKey: 'idempotency-uncertain',
      schemaVersion: 1,
      payload: { correlationId: 'correlation-1', messageId: 'message-1', bodyText: 'must-not-be-forwarded' },
      attempts: 1,
    });
    expect(calls[0]).toMatchObject(['reconcile', expect.objectContaining({ messageId: 'message-1', eventType: 'email.send.uncertain' })]);
    expect(JSON.stringify(calls[0])).not.toContain('must-not-be-forwarded');
  });

  it('routes attachment scan handoff by attachment ID only', async () => {
    const calls: unknown[] = [];
    const publisher = createQueueOutboxPublisher({ enabled: true, enqueue: async (...args: unknown[]) => { calls.push(args); } });
    await publisher.publish({
      id: 'event-scan', eventType: 'file.scan.requested', aggregateType: 'EMAIL_ATTACHMENT', aggregateId: 'attachment-1', idempotencyKey: 'idempotency-scan', schemaVersion: 1,
      payload: { correlationId: 'correlation-1', attachmentId: 'attachment-1', objectKey: 'must-not-be-forwarded' }, attempts: 1,
    });
    expect(calls[0]).toMatchObject(['file-scan', expect.objectContaining({ attachmentId: 'attachment-1', eventType: 'file.scan.requested' })]);
    expect(JSON.stringify(calls[0])).not.toContain('must-not-be-forwarded');
  });
});
