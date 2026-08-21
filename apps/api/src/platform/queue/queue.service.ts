import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/config.module.js';
import { Inject } from '@nestjs/common';

export interface QueuePayload {
  schemaVersion: number;
  eventId: string;
  correlationId: string;
  entityId: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = /(token|secret|password|authorization|cookie|email|phone|address|access[_-]?key)/i;

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

  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {
    this.connection = connectionFromUrl(config.redis.url);
  }

  get enabled(): boolean { return this.config.queue.enabled; }

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
  }

  async assertReady(): Promise<void> {
    if (!this.enabled) return;
    const queue = this.queue(this.config.queue.names[0]);
    await queue.getJobCounts();
  }

  startWorker(name: string, handler: (payload: QueuePayload) => Promise<void>): void {
    if (!this.enabled || this.workers.has(name)) return;
    const worker = new Worker<QueuePayload>(name, async (job) => handler(job.data), {
      connection: { ...this.connection, maxRetriesPerRequest: null },
      prefix: this.config.queue.prefix,
      concurrency: this.config.queue.concurrency,
    });
    worker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'queue_job_failed', queue: name, jobId: job?.id, error: error.message })));
    this.workers.set(name, worker);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
