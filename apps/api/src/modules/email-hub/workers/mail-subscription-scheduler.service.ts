import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { QueueService } from '../../../platform/queue/queue.service.js';

const SCHEDULER_LOCK_NAME = 'cms.scheduler.mail-subscriptions';
const RENEWAL_LEAD_MS = 15 * 60 * 1000;
const MAX_MAILBOXES_PER_TICK = 100;

@Injectable()
export class MailSubscriptionSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async runOnce(now = new Date()): Promise<number> {
    if (!this.queue.enabled) return 0;

    const due = await this.prisma.$transaction(async (transaction) => {
      const [lock] = await transaction.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtextextended(${SCHEDULER_LOCK_NAME}, 0)) AS locked
      `;
      if (!lock?.locked) return [];
      const dueBefore = new Date(now.getTime() + RENEWAL_LEAD_MS);
      return transaction.mailbox.findMany({
        where: {
          providerSubscriptionId: { not: null },
          status: { in: ['HEALTHY', 'DEGRADED'] },
          OR: [
            { providerSubscriptionExpiresAt: null },
            { providerSubscriptionExpiresAt: { lte: dueBefore } },
          ],
        },
        select: { id: true, providerSubscriptionExpiresAt: true },
        orderBy: [{ providerSubscriptionExpiresAt: 'asc' }, { id: 'asc' }],
        take: MAX_MAILBOXES_PER_TICK,
      });
    });

    for (const mailbox of due) {
      const expiryKey = mailbox.providerSubscriptionExpiresAt?.getTime() ?? 'missing';
      const eventId = `mail-subscription-renew:${mailbox.id}:${expiryKey}`;
      await this.queue.enqueue('mail-subscription', {
        schemaVersion: 1,
        eventId,
        correlationId: eventId,
        entityId: mailbox.id,
      }, { attempts: 1 });
    }
    return due.length;
  }
}

