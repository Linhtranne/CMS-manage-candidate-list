import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/config.module.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';

export interface QueuePayload {
  schemaVersion: number;
  eventId: string;
  correlationId: string;
  entityId: string;
  [key: string]: unknown;
}

export interface QueueHealthCounts {
  enabled: boolean;
  available: boolean;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
}

const SENSITIVE_KEYS = /(token|secret|password|authorization|cookie|email|phone|address|object[_-]?key|signed[_-]?url|access[_-]?key)/i;

function connectionFromUrl(raw: string): ConnectionOptions {
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
  };
}

function assertNoSensitivePayload(value: unknown, path = 'payload'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitivePayload(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) throw new Error(`QUEUE_PAYLOAD_SENSITIVE_FIELD:${path}.${key}`);
    assertNoSensitivePayload(child, `${path}.${key}`);
  }
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: ConnectionOptions;
  private readonly queues = new Map<string, Queue<QueuePayload>>();
  private readonly workers = new Map<string, Worker<QueuePayload>>();

  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig, @Optional() private readonly telemetry?: TelemetryService) {
    this.connection = connectionFromUrl(config.redis.url);
  }

  get enabled(): boolean { return this.config.queue.enabled; }

  get configuredQueueNames(): readonly string[] { return this.config.queue.names; }

  private queue(name: string): Queue<QueuePayload> {
    if (!this.config.queue.names.includes(name)) throw new Error(`QUEUE_NOT_ALLOWED:${name}`);
    const existing = this.queues.get(name);
    if (existing) return existing;
    const created = new Queue<QueuePayload>(name, { connection: this.connection, prefix: this.config.queue.prefix });
    this.queues.set(name, created);
    return created;
  }

  async enqueue(name: string, payload: QueuePayload, options: JobsOptions = {}): Promise<void> {
    if (!this.enabled) return;
    if (!payload.schemaVersion || !payload.eventId || !payload.correlationId || !payload.entityId) {
      throw new Error('QUEUE_PAYLOAD_INVALID');
    }
    assertNoSensitivePayload(payload);
    await this.queue(name).add(payload.eventId, payload, { jobId: payload.eventId, removeOnComplete: 1000, removeOnFail: 5000, ...options });
    this.telemetry?.increment(`queue.${name}.enqueued`);
  }

  async assertReady(): Promise<void> {
    if (!this.enabled) return;
    const queue = this.queue(this.config.queue.names[0]);
    await queue.getJobCounts();
  }

  async healthCounts(): Promise<QueueHealthCounts> {
    // The configured list is the allowlist for this deployment, so count every
    // configured queue (including provider-specific names such as
    // `mail-outbound` and `notifications`) instead of silently omitting one.
    const queueNames = this.config.queue.names;
    const empty: QueueHealthCounts = { enabled: this.enabled, available: !this.enabled, waiting: 0, active: 0, delayed: 0, failed: 0 };
    if (!this.enabled || !queueNames.length) return empty;

    try {
      const counts = await Promise.all(queueNames.map((name) => this.queue(name).getJobCounts('waiting', 'active', 'delayed', 'failed')));
      return counts.reduce<QueueHealthCounts>((total, count) => ({
        ...total,
        available: true,
        waiting: total.waiting + (count.waiting ?? 0),
        active: total.active + (count.active ?? 0),
        delayed: total.delayed + (count.delayed ?? 0),
        failed: total.failed + (count.failed ?? 0),
      }), { ...empty, available: true });
    } catch {
      return { ...empty, available: false };
    }
  }

  startWorker(name: string, handler: (payload: QueuePayload) => Promise<void>): void {
    if (!this.enabled || this.workers.has(name)) return;
    const worker = new Worker<QueuePayload>(name, async (job) => handler(job.data), {
      connection: { ...this.connection, maxRetriesPerRequest: null },
      prefix: this.config.queue.prefix,
      concurrency: this.config.queue.concurrency,
    });
    this.telemetry?.increment(`queue.${name}.worker_started`);
    worker.on('failed', (job, error) => {
      this.telemetry?.increment(`queue.${name}.failed`);
      console.error(JSON.stringify({ event: 'queue_job_failed', queue: name, jobId: job?.id, error: sanitizeQueueError(error) }));
    });
    this.workers.set(name, worker);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}

function sanitizeQueueError(error: Error): string {
  // Provider SDKs may echo recipient/body data in exception messages. Keep
  // operational classification while preventing accidental PII telemetry.
  const candidate = error as unknown as { code?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : 'QUEUE_JOB_FAILED';
  return code.replace(/[^A-Z0-9_.-]/gi, '_').slice(0, 120);
}
