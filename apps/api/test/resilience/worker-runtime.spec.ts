import { describe, expect, it, vi } from 'vitest';
import { WorkerRuntimeService } from '../../src/platform/queue/worker-runtime.service.js';

function queueStub(enabled: boolean) {
  return {
    enabled,
    startWorker: vi.fn(),
  };
}

describe('worker runtime fail-closed behavior', () => {
  it('refuses to boot when queue processing is enabled without a registered handler', () => {
    const queue = queueStub(true);

    expect(() => new WorkerRuntimeService(queue as never).onModuleInit()).toThrow('QUEUE_HANDLER_NOT_REGISTERED');
    expect(queue.startWorker).not.toHaveBeenCalled();
  });

  it('does not open worker resources when queue processing is disabled', () => {
    const queue = queueStub(false);

    expect(() => new WorkerRuntimeService(queue as never).onModuleInit()).not.toThrow();
    expect(queue.startWorker).not.toHaveBeenCalled();
  });
});
