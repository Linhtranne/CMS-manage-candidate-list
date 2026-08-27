import Redis from 'ioredis';
import type { MailOperationalPolicy } from '../../../../platform/config/config.schema.js';

export const MAIL_PROVIDER_OPERATION_LIMITER = Symbol('MAIL_PROVIDER_OPERATION_LIMITER');

export interface MailOperationLimiter {
  run<T>(operation: string, action: () => Promise<T>): Promise<T>;
}

export interface RedisCounterClient {
  incr(key: string): Promise<number | string>;
  decr(key: string): Promise<number | string>;
  expire(key: string, seconds: number): Promise<unknown>;
  pttl(key: string): Promise<number>;
  quit(): Promise<unknown>;
}

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class NoopMailOperationLimiter implements MailOperationLimiter {
  run<T>(_operation: string, action: () => Promise<T>): Promise<T> { return action(); }
}

/**
 * Redis-backed provider quota guard. The fixed window is intentionally keyed
 * by provider, not mailbox, because DEC-003 quota is normally tenant/provider
 * scoped. Redis errors fail closed before the provider call.
 */
export class RedisMailOperationLimiter implements MailOperationLimiter {
  private readonly redis: RedisCounterClient;
  private readonly ownsClient: boolean;
  private readonly prefix: string;

  constructor(redisUrl: string, private readonly policy: MailOperationalPolicy, client?: RedisCounterClient, prefix = 'cms:mail:provider') {
    this.redis = client ?? new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1_000, enableOfflineQueue: false });
    this.ownsClient = !client;
    this.prefix = prefix;
  }

  async run<T>(operation: string, action: () => Promise<T>): Promise<T> {
    void operation;
    await this.acquireRateWindow();
    const release = await this.acquireConcurrency();
    try {
      return await action();
    } finally {
      await release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ownsClient) await this.redis.quit().catch(() => undefined);
  }

  private async acquireRateWindow(): Promise<void> {
    const windowSeconds = 60;
    while (true) {
      const window = Math.floor(Date.now() / (windowSeconds * 1000));
      const rateKey = `${this.prefix}:rate:${window}`;
      const rateCount = Number(await this.redis.incr(rateKey));
      if (rateCount === 1) await this.redis.expire(rateKey, windowSeconds + 1);
      if (rateCount > this.policy.ratePerMinute) {
        await this.redis.decr(rateKey).catch(() => undefined);
        const remaining = await this.redis.pttl(rateKey);
        await sleep(Math.max(50, Math.min(remaining > 0 ? remaining : 1_000, 60_000)));
        continue;
      }

      const burstKey = `${this.prefix}:burst:${Math.floor(Date.now() / 1000)}`;
      const burstCount = Number(await this.redis.incr(burstKey));
      if (burstCount === 1) await this.redis.expire(burstKey, 2);
      if (burstCount <= this.policy.burst) return;
      await this.redis.decr(burstKey).catch(() => undefined);
      await this.redis.decr(rateKey).catch(() => undefined);
      const remaining = await this.redis.pttl(burstKey);
      await sleep(Math.max(50, Math.min(remaining > 0 ? remaining : 1_000, 2_000)));
    }
  }

  private async acquireConcurrency(): Promise<() => Promise<void>> {
    const key = `${this.prefix}:active`;
    const leaseSeconds = Math.max(60, Math.min(this.policy.retryWindowSeconds, 300));
    while (true) {
      const count = Number(await this.redis.incr(key));
      if (count === 1) await this.redis.expire(key, leaseSeconds);
      if (count <= this.policy.maxConcurrency) {
        return async () => { await this.redis.decr(key).catch(() => undefined); };
      }
      await this.redis.decr(key).catch(() => undefined);
      await sleep(50);
    }
  }
}
