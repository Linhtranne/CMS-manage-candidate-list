import { http, HttpResponse } from 'msw';
import { workFixtures, workSummaryFixture } from '../fixtures/work';

export const workHandlers = [
  http.get('*/api/v1/work-items/summary', ({ request }) => {
    const view = new URL(request.url).searchParams.get('view');
    return HttpResponse.json({ summary: view === 'overdue' ? { ...workSummaryFixture, overdue: 3 } : workSummaryFixture });
  }),
  http.get('*/api/v1/work-items/:id', ({ params }) => {
    const item = workFixtures.find((candidate) => candidate.id === params.id);
    return item ? HttpResponse.json(item) : HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy công việc' }, { status: 404 });
  }),
  http.get('*/api/v1/work-items', ({ request }) => {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'actionable';
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    let items = workFixtures.filter((item) => !query || `${item.title} ${item.candidate.name} ${item.client.name}`.toLowerCase().includes(query));
    if (view === 'overdue') items = items.filter((item) => new Date(item.dueAt).getTime() < Date.now());
    if (view === 'today') items = items.filter((item) => new Date(item.dueAt).getTime() >= Date.now() && new Date(item.dueAt).getTime() <= Date.now() + 24 * 3_600_000);
    if (view === 'waiting-reply') items = items.filter((item) => item.status === 'WAITING_REPLY');
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.patch('*/api/v1/work-items/:id', async ({ params, request }) => {
    const item = workFixtures.find((candidate) => candidate.id === params.id);
    if (!item) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy công việc' }, { status: 404 });
    const body = (await request.json()) as { version?: number; status?: typeof item.status; dueAt?: string; assigneeId?: string };
    if (body.version !== item.version) return HttpResponse.json({ code: 'VERSION_CONFLICT', message: 'Dữ liệu vừa được cập nhật' }, { status: 409 });
    Object.assign(item, { ...body, version: item.version + 1, assignee: body.assigneeId ? { ...item.assignee, id: body.assigneeId } : item.assignee, updatedAt: new Date().toISOString() });
    return HttpResponse.json(item);
  })
];

