import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxDispatcher } from './outbox.dispatcher.js';
import { MailSubscriptionSchedulerService } from '../../modules/email-hub/workers/mail-subscription-scheduler.service.js';

const SCHEDULER_LOCK_NAME = 'cms.scheduler.outbox';

@Injectable()
export class SchedulerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dispatcher: OutboxDispatcher,
    private readonly prisma: PrismaService,
    @Optional() private readonly mailSubscriptionScheduler?: MailSubscriptionSchedulerService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => { void this.runOnce().catch(() => undefined); }, 1000);
  }

  async runOnce(): Promise<number> {
    const dispatched = await this.prisma.$transaction(async (tx) => {
      const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${SCHEDULER_LOCK_NAME}, 0)) AS locked
      `;
      if (!lock?.locked) return 0;
      return this.dispatcher.dispatchBatch(25, tx);
    });
    if (this.mailSubscriptionScheduler) await this.mailSubscriptionScheduler.runOnce();
    return dispatched;
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
