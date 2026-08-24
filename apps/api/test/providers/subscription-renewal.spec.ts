import { describe, expect, it, vi } from 'vitest';
import { MailSubscriptionSchedulerService } from '../../src/modules/email-hub/workers/mail-subscription-scheduler.service.js';
import { RenewMailSubscriptionProcessor } from '../../src/modules/email-hub/workers/renew-mail-subscription.processor.js';

function payload(entityId = 'mailbox-1') {
  return { schemaVersion: 1, eventId: `event:${entityId}`, correlationId: `correlation:${entityId}`, entityId };
}

describe('mail subscription lifecycle', () => {
  it('schedules due subscriptions with an idempotent queue key and no provider identifiers', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ locked: true }]),
      mailbox: { findMany: vi.fn().mockResolvedValue([{ id: 'mailbox-1', providerSubscriptionExpiresAt: new Date('2026-08-24T10:00:00.000Z') }]) },
    };
    const prisma = { $transaction: vi.fn(async (work: (tx: typeof transaction) => unknown) => work(transaction)) };
    const queue = { enabled: true, enqueue: vi.fn().mockResolvedValue(undefined) };
    const scheduler = new MailSubscriptionSchedulerService(prisma as never, queue as never);

    await expect(scheduler.runOnce(new Date('2026-08-24T09:50:00.000Z'))).resolves.toBe(1);
    expect(queue.enqueue).toHaveBeenCalledWith('mail-subscription', {
      schemaVersion: 1,
      eventId: 'mail-subscription-renew:mailbox-1:1787565600000',
      correlationId: 'mail-subscription-renew:mailbox-1:1787565600000',
      entityId: 'mailbox-1',
    }, { attempts: 1 });
    expect(JSON.stringify(queue.enqueue.mock.calls[0]?.[1])).not.toContain('providerSubscription');
  });

  it('renews a subscription and emits an id-only success event', async () => {
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ id: 'mailbox-1', status: 'HEALTHY', providerSubscriptionId: 'provider-secret-id' }),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => unknown) => work(repository, {})),
      markSubscriptionRenewed: vi.fn().mockResolvedValue({ count: 1 }),
      markSubscriptionRenewalFailure: vi.fn(),
    };
    const provider = { renewSubscription: vi.fn().mockResolvedValue({ subscriptionId: 'provider-secret-id-2', expiresAt: new Date('2026-08-24T12:00:00.000Z') }) };
    const outbox = { append: vi.fn().mockResolvedValue(undefined) };
    const processor = new RenewMailSubscriptionProcessor(repository as never, provider as never, outbox as never);

    await processor.handle(payload());
    expect(provider.renewSubscription).toHaveBeenCalledWith('provider-secret-id');
    expect(repository.markSubscriptionRenewed).toHaveBeenCalledWith('mailbox-1', expect.objectContaining({ expiresAt: expect.any(Date) }));
    expect(outbox.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'mail.subscription.renewed',
      payload: { mailboxId: 'mailbox-1', expiresAt: '2026-08-24T12:00:00.000Z' },
    }));
  });

  it('pauses auth failures and emits a sanitized operational failure event', async () => {
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ id: 'mailbox-1', status: 'HEALTHY', providerSubscriptionId: 'provider-secret-id' }),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => unknown) => work(repository, {})),
      markSubscriptionRenewed: vi.fn(),
      markSubscriptionRenewalFailure: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const provider = { renewSubscription: vi.fn().mockRejectedValue(Object.assign(new Error('token bearer secret=do-not-leak'), { code: 'AUTH_TOKEN_EXPIRED' })) };
    const outbox = { append: vi.fn().mockResolvedValue(undefined) };
    const processor = new RenewMailSubscriptionProcessor(repository as never, provider as never, outbox as never);

    await processor.handle(payload());
    expect(repository.markSubscriptionRenewalFailure).toHaveBeenCalledWith('mailbox-1', 'PAUSED_AUTH');
    expect(outbox.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'mail.subscription.renewal.failed',
      payload: { mailboxId: 'mailbox-1', reason: 'AUTH_TOKEN_EXPIRED', status: 'PAUSED_AUTH' },
    }));
    expect(JSON.stringify(outbox.append.mock.calls[0])).not.toContain('do-not-leak');
  });
});

