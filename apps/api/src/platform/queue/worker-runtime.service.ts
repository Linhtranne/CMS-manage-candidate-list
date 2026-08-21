import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Injectable()
export class WorkerRuntimeService implements OnModuleInit {
  constructor(private readonly queue: QueueService) {}

  onModuleInit(): void {
    if (!this.queue.enabled) return;
    throw new Error('QUEUE_HANDLER_NOT_REGISTERED');
  }
}
