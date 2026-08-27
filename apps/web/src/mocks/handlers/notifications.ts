import { http, HttpResponse } from 'msw';

type MockNotification = {
  id: string;
  kind: 'INTERVIEW_SCHEDULED' | 'MAIL_NEEDS_ACTION' | 'JOURNEY_AT_RISK' | 'TASK_ASSIGNED' | 'APPLICATION_DECISION';
  severity: 'INFO' | 'WARNING' | 'DANGER';
  params: Record<string, string>;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const notifications: MockNotification[] = [
  { id: '10000000-0000-4000-8000-000000009001', kind: 'INTERVIEW_SCHEDULED', severity: 'WARNING', params: { name: 'Nguyễn Minh An' }, href: '/applications?selectedId=10000000-0000-4000-8000-000000000502', readAt: null, createdAt: '2026-08-26T09:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000009002', kind: 'MAIL_NEEDS_ACTION', severity: 'INFO', params: {}, href: '/mailbox?selectedId=10000000-0000-4000-8000-000000000711', readAt: null, createdAt: '2026-08-26T08:00:00.000Z' },
  { id: '10000000-0000-4000-8000-000000009003', kind: 'JOURNEY_AT_RISK', severity: 'DANGER', params: { name: 'Võ Thanh Tùng' }, href: '/supply-journeys?selectedId=10000000-0000-4000-8000-000000000813', readAt: null, createdAt: '2026-08-26T07:00:00.000Z' },
];

export const notificationsHandlers = [
  http.get('*/api/v1/notifications', ({ request }) => {
    const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get('limit') ?? 20) || 20));
    const items = notifications.slice(0, limit);
    return HttpResponse.json({ items, unreadCount: notifications.filter((item) => !item.readAt).length, nextCursor: null });
  }),
  http.post('*/api/v1/notifications/read-all', () => {
    const readAt = new Date().toISOString();
    notifications.forEach((item) => { item.readAt ??= readAt; });
    return HttpResponse.json({ updatedCount: notifications.filter((item) => item.readAt === readAt).length });
  }),
  http.post('*/api/v1/notifications/:id/read', ({ params }) => {
    const item = notifications.find((notification) => notification.id === String(params.id));
    if (!item) return HttpResponse.json({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' }, { status: 404 });
    item.readAt ??= new Date().toISOString();
    return HttpResponse.json(item);
  }),
];
