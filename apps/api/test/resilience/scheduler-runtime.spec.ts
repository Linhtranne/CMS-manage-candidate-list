import { describe, expect, it, vi } from 'vitest';
import { SchedulerRuntimeService } from '../../src/platform/outbox/scheduler-runtime.service.js';

describe('scheduler runtime lock', () => {
  it('dispatches only while holding the PostgreSQL advisory lock', async () => {
    const transaction = { $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]) };
    const prisma = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)) };
    const dispatcher = { dispatchBatch: vi.fn().mockResolvedValue(1) };
    const scheduler = new SchedulerRuntimeService(dispatcher as never, prisma as never);

    await expect(scheduler.runOnce()).resolves.toBe(1);
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(dispatcher.dispatchBatch).toHaveBeenCalledWith(25, transaction);
  });

  it('skips a tick when another scheduler owns the lock', async () => {
    const transaction = { $queryRaw: vi.fn().mockResolvedValue([{ locked: false }]) };
    const prisma = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)) };
    const dispatcher = { dispatchBatch: vi.fn() };
    const scheduler = new SchedulerRuntimeService(dispatcher as never, prisma as never);

    await expect(scheduler.runOnce()).resolves.toBe(0);
    expect(dispatcher.dispatchBatch).not.toHaveBeenCalled();
  });
});
