import { describe, expect, it } from 'vitest';
import { QueueService } from '../../src/platform/queue/queue.service.js';
import { loadConfig } from '../../src/platform/config/config.schema.js';

describe('graceful shutdown', () => {
  it('closes disabled queue resources idempotently', async () => {
    const queue = new QueueService(loadConfig({ NODE_ENV: 'test' }));
    await expect(queue.onModuleDestroy()).resolves.toBeUndefined();
    await expect(queue.onModuleDestroy()).resolves.toBeUndefined();
  });
});
