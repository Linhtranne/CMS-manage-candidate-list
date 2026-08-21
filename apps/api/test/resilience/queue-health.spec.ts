import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/platform/config/config.schema.js';
import { QueueService } from '../../src/platform/queue/queue.service.js';
import { TelemetryService } from '../../src/platform/telemetry/telemetry.service.js';

describe('queue and telemetry fail-closed boundaries', () => {
  it('keeps queue disabled in test without opening Redis', async () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    const queue = new QueueService(config);
    await expect(queue.assertReady()).resolves.toBeUndefined();
    await queue.onModuleDestroy();
  });

  it('records bounded metric counters', () => {
    const telemetry = new TelemetryService();
    telemetry.increment('api.requests');
    telemetry.increment('api.requests');
    expect(telemetry.snapshot()).toMatchObject({ 'api.requests': 2 });
  });

  it('rejects sensitive queue payloads before touching Redis', async () => {
    const config = loadConfig({ NODE_ENV: 'test', QUEUE_ENABLED: 'true', REDIS_URL: 'redis://127.0.0.1:63999' });
    const queue = new QueueService(config);
    await expect(queue.enqueue('outbox', {
      schemaVersion: 1,
      eventId: 'event-1',
      correlationId: 'corr-1',
      entityId: 'entity-1',
      email: 'person@example.invalid',
    })).rejects.toThrow('QUEUE_PAYLOAD_SENSITIVE_FIELD');
    await queue.onModuleDestroy();
  });
});
