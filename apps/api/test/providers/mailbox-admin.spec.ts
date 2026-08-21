import { describe, expect, it, vi } from 'vitest';
import { MailboxAdminController } from '../../src/modules/email-hub/http/mailbox-admin.controller.js';

function request() {
  return { auth: { userId: 'user-1', sessionId: 'session-1', user: { status: 'ACTIVE' } } } as never;
}

describe('mailbox admin operations', () => {
  it('masks mailbox address and provider health output', async () => {
    const repository = { findMailbox: vi.fn().mockResolvedValue({ id: 'mailbox-1', address: 'shared@example.com', provider: 'DISABLED', status: 'NOT_CONFIGURED' }) };
    const provider = { validateConnection: vi.fn().mockResolvedValue({ provider: 'DISABLED', status: 'not_configured', checkedAt: new Date(), detail: 'MAIL_PROVIDER=DISABLED' }) };
    const controller = new MailboxAdminController(repository as never, {} as never, provider as never, {} as never, {} as never);
    await expect(controller.health('mailbox-1')).resolves.toMatchObject({ id: 'mailbox-1', address: 's***@example.com', providerHealth: { status: 'not_configured' } });
    expect(JSON.stringify(await controller.health('mailbox-1'))).not.toContain('shared@example.com');
  });

  it('audits pause/resume and refuses resume while provider is disabled', async () => {
    const repository = { pauseMailboxOperator: vi.fn().mockResolvedValue(true), resumeMailbox: vi.fn().mockResolvedValue(false) };
    const audit = { append: vi.fn().mockResolvedValue(undefined) };
    const prisma = { $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})) };
    const controller = new MailboxAdminController(repository as never, {} as never, {} as never, audit as never, prisma as never);
    await expect(controller.pause('mailbox-1', request())).resolves.toEqual({ id: 'mailbox-1', status: 'PAUSED_OPERATOR' });
    expect(audit.append).toHaveBeenCalledWith({}, expect.objectContaining({ action: 'MAILBOX_PAUSED', entityId: 'mailbox-1' }));
    await expect(controller.resume('mailbox-1', request())).rejects.toThrow('MAILBOX_RESUME_BLOCKED');
  });

  it('queues sync with mailbox ID only and fails closed when queue is disabled', async () => {
    const queue = { enabled: true, enqueue: vi.fn().mockResolvedValue(undefined) };
    const audit = { append: vi.fn().mockResolvedValue(undefined) };
    const prisma = { $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})) };
    const controller = new MailboxAdminController({} as never, queue as never, {} as never, audit as never, prisma as never);
    await expect(controller.sync('mailbox-1', request())).resolves.toEqual({ id: 'mailbox-1', status: 'QUEUED' });
    expect(queue.enqueue).toHaveBeenCalledWith('mail-sync', expect.objectContaining({ mailboxId: 'mailbox-1', entityId: 'mailbox-1' }));
    expect(JSON.stringify(queue.enqueue.mock.calls[0])).not.toContain('@');
    queue.enabled = false;
    await expect(controller.sync('mailbox-1', request())).rejects.toThrow('QUEUE_DISABLED');
  });
});
