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
    for (const registration of this.handlers) this.queue.startWorker(registration.name, registration.handler);
  }
}
