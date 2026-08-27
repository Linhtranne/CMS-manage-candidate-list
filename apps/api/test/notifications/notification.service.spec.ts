import { describe, expect, it, vi } from 'vitest';
import { NotificationNotFoundError, NotificationService } from '../../src/modules/notifications/application/notification.service.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: '10000000-0000-4000-8000-000000009001',
  kind: 'MAIL_NEEDS_ACTION',
  severity: 'INFO',
  params: {},
  href: '/mailbox',
  readAt: null,
  createdAt: new Date('2026-08-26T09:00:00.000Z'),
  dedupeKey: 'demo:mail',
  userId: 'user-1',
  ...overrides,
});

function makeService(notification: Record<string, unknown>) {
  return new NotificationService({ notification } as never);
}

describe('NotificationService', () => {
  it('lists only the requested user and returns unread count', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const count = vi.fn().mockResolvedValue(2);
    const service = makeService({ findMany, count });

    const result = await service.list('user-1', '10');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' }, take: 10 }));
    expect(count).toHaveBeenCalledWith({ where: { userId: 'user-1', readAt: null } });
    expect(result).toMatchObject({ unreadCount: 2, nextCursor: null, items: [{ id: row().id, href: '/mailbox', readAt: null }] });
  });

  it('does not allow marking a notification belonging to another user', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = makeService({ updateMany, findFirst });

    await expect(service.markRead('user-2', row().id)).rejects.toBeInstanceOf(NotificationNotFoundError);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: row().id, userId: 'user-2', readAt: null } }));
  });

  it('upserts a deduplicated notification without deleting the existing read state', async () => {
    const upsert = vi.fn().mockResolvedValue(row({ readAt: new Date('2026-08-26T10:00:00.000Z') }));
    const service = makeService({ upsert });

    const result = await service.create({ userId: 'user-1', kind: 'TASK_ASSIGNED', severity: 'INFO', params: { title: 'Follow up' }, href: '/work?selectedId=task-1', dedupeKey: 'task:1' });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { dedupeKey: 'task:1' }, update: {} }));
    expect(result.readAt).toBe('2026-08-26T10:00:00.000Z');
  });
});
