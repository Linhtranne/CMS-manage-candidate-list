import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/platform/config/config.schema.js';
import { QueueService } from '../../src/platform/queue/queue.service.js';
import { TelemetryService } from '../../src/platform/telemetry/telemetry.service.js';
import { WorkerRuntimeService } from '../../src/platform/queue/worker-runtime.service.js';

describe('queue and telemetry fail-closed boundaries', () => {
  it('keeps queue disabled in test without opening Redis', async () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    const queue = new QueueService(config);
    await expect(queue.assertReady()).resolves.toBeUndefined();
    await expect(queue.healthCounts()).resolves.toEqual({ enabled: false, available: true, waiting: 0, active: 0, delayed: 0, failed: 0 });
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

  it('rejects a production worker when an enabled queue has no registered handler', () => {
    const queue = {
      enabled: true,
      configuredQueueNames: ['outbox', 'file-scan'],
      startWorker: () => undefined,
    } as unknown as QueueService;
    const runtime = new WorkerRuntimeService(queue, [{ name: 'outbox', handler: async () => undefined }]);
    expect(() => runtime.onModuleInit()).toThrow('QUEUE_HANDLER_NOT_REGISTERED:file-scan');
  });

  it('rejects duplicate handler registrations before starting workers', () => {
    const queue = {
      enabled: true,
      configuredQueueNames: ['outbox'],
      startWorker: () => undefined,
    } as unknown as QueueService;
    const runtime = new WorkerRuntimeService(queue, [
      { name: 'outbox', handler: async () => undefined },
      { name: 'outbox', handler: async () => undefined },
    ]);
    expect(() => runtime.onModuleInit()).toThrow('QUEUE_HANDLER_DUPLICATE:outbox');
  });
});
