import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxDispatcher } from './outbox.dispatcher.js';

const SCHEDULER_LOCK_NAME = 'cms.scheduler.outbox';

@Injectable()
export class SchedulerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dispatcher: OutboxDispatcher,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => { void this.runOnce().catch(() => undefined); }, 1000);
    this.timer.unref();
  }

  async runOnce(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${SCHEDULER_LOCK_NAME}, 0)) AS locked
      `;
      if (!lock?.locked) return 0;
      return this.dispatcher.dispatchBatch(25, tx);
    });
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
