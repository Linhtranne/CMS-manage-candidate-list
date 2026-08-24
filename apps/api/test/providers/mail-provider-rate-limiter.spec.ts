import { describe, expect, it, vi } from 'vitest';
import { FakeMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/fake.adapter.js';
import { RateLimitedMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/rate-limited-mail-provider.adapter.js';
import { NoopMailOperationLimiter, RedisMailOperationLimiter, type RedisCounterClient } from '../../src/modules/email-hub/infrastructure/providers/mail-provider-rate-limiter.js';

class FakeRedis implements RedisCounterClient {
  readonly values = new Map<string, number>();
  readonly expiries = new Map<string, number>();
  incr(key: string): Promise<number> { const value = (this.values.get(key) ?? 0) + 1; this.values.set(key, value); return Promise.resolve(value); }
  decr(key: string): Promise<number> { const value = Math.max(0, (this.values.get(key) ?? 0) - 1); this.values.set(key, value); return Promise.resolve(value); }
  expire(key: string, seconds: number): Promise<unknown> { this.expiries.set(key, seconds); return Promise.resolve(1); }
  pttl(): Promise<number> { return Promise.resolve(60_000); }
  quit(): Promise<unknown> { return Promise.resolve('OK'); }
}

const policy = { ratePerMinute: 10, burst: 2, maxConcurrency: 1, maxAttempts: 8, retryWindowSeconds: 60 } as const;

describe('mail provider operational limiter', () => {
  it('applies a Redis-backed rate window and releases concurrency permits', async () => {
    const redis = new FakeRedis();
    const limiter = new RedisMailOperationLimiter('redis://unused', policy, redis, 'test:mail');
    await expect(limiter.run('send', async () => 'accepted')).resolves.toBe('accepted');
    expect(redis.values.get('test:mail:rate:')).toBeUndefined();
    expect([...redis.values.entries()].find(([key]) => key.startsWith('test:mail:rate:'))?.[1]).toBe(1);
    expect(redis.values.get('test:mail:active')).toBe(0);
    expect([...redis.values.keys()].some((key) => key.includes('@'))).toBe(false);
  });

  it('wraps every provider call without bypassing the limiter', async () => {
    const provider = Object.assign(new FakeMailProviderAdapter(), { provider: 'MICROSOFT_GRAPH' as const });
    const limiter = new NoopMailOperationLimiter();
    const bound = new RateLimitedMailProviderAdapter(provider, limiter);
    const result = await bound.send({ from: 'ops@example.test', to: ['qa@example.test'], subject: 'Subject', bodyText: 'Body' }, 'rate-key');
    expect(result.providerMessageId).toMatch(/^fake-/);
  });

  it('fails closed when Redis is unavailable before invoking the provider', async () => {
    const redis = { incr: vi.fn().mockRejectedValue(new Error('redis unavailable')), decr: vi.fn(), expire: vi.fn(), pttl: vi.fn(), quit: vi.fn() } as unknown as RedisCounterClient;
    const limiter = new RedisMailOperationLimiter('redis://unused', policy, redis);
    const provider = vi.fn().mockResolvedValue('sent');
    await expect(limiter.run('send', provider)).rejects.toThrow('redis unavailable');
    expect(provider).not.toHaveBeenCalled();
  });
});

