import { Inject, Injectable, Optional, OnModuleInit } from '@nestjs/common';
import { QueueService, type QueuePayload } from './queue.service.js';

export const QUEUE_HANDLERS = Symbol('QUEUE_HANDLERS');
export interface QueueHandlerRegistration {
  name: string;
  handler: (payload: QueuePayload) => Promise<void>;
}

@Injectable()
export class WorkerRuntimeService implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    @Optional() @Inject(QUEUE_HANDLERS) private readonly handlers: readonly QueueHandlerRegistration[] = [],
  ) {}

  onModuleInit(): void {
    if (!this.queue.enabled) return;
    if (!this.handlers.length) throw new Error('QUEUE_HANDLER_NOT_REGISTERED');
    const configured = this.queue.configuredQueueNames;
    const registered = new Set<string>();
    for (const registration of this.handlers) {
      if (registered.has(registration.name)) throw new Error(`QUEUE_HANDLER_DUPLICATE:${registration.name}`);
      if (!configured.includes(registration.name)) throw new Error(`QUEUE_HANDLER_NOT_ALLOWED:${registration.name}`);
      registered.add(registration.name);
    }
    const missing = configured.filter((name) => !registered.has(name));
    if (missing.length) throw new Error(`QUEUE_HANDLER_NOT_REGISTERED:${missing.join(',')}`);
    for (const registration of this.handlers) this.queue.startWorker(registration.name, registration.handler);
  }
}
