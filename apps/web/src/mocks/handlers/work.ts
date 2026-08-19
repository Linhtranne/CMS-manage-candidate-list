import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { candidateFixtures } from '../fixtures/candidates';
import { clientFixtures } from '../fixtures/clients';
import { orderFixtures } from '../fixtures/orders';
import { workFixtures, workSummaryFixture } from '../fixtures/work';

type CreateWorkItemRequest = components['schemas']['CreateWorkItemRequest'];

const assignees = new Map([
  ['usr-nguyen-minh-anh', 'Nguyễn Minh Anh'],
  ['usr-tran-thu-ha', 'Trần Thu Hà'],
  ['usr-le-quang-huy', 'Lê Quang Huy']
]);

export const workHandlers = [
  http.post('*/api/v1/work-items', async ({ request }) => {
    const body = await request.json() as CreateWorkItemRequest;
    const candidate = candidateFixtures.find((item) => item.id === body.candidateId);
    if (!candidate) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy ứng viên.' }, { status: 404 });
    const order = body.orderId ? orderFixtures.find((item) => item.id === body.orderId) : undefined;
    const client = body.clientId ? clientFixtures.find((item) => item.id === body.clientId) : undefined;
    const item = {
      id: `work-manual-${Date.now()}`,
      title: body.title,
      priority: body.priority,
      status: 'TODO' as const,
      dueAt: body.dueAt,
      assignee: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' },
      sourceType: 'MANUAL',
      sourceLabel: 'Tạo thủ công từ hồ sơ ứng viên',
      candidate: { id: candidate.id, code: candidate.code, name: candidate.name },
      order: order ? { id: order.id, code: order.code, position: order.position } : { id: 'unassigned-order', code: '—', position: 'Chưa gắn đơn tuyển' },
      client: client ? { id: client.id, name: client.name } : { id: 'unassigned-client', name: 'Chưa gắn khách hàng' },
      updatedAt: new Date().toISOString(),
      version: 1,
      notes: body.notes ?? undefined
    };
    workFixtures.unshift(item);
    return HttpResponse.json(item, { status: 201 });
  }),
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
    if (view === 'seven-days') items = items.filter((item) => new Date(item.dueAt).getTime() >= Date.now() && new Date(item.dueAt).getTime() <= Date.now() + 7 * 24 * 3_600_000);
    if (view === 'waiting-reply') items = items.filter((item) => item.status === 'WAITING_REPLY');
    if (view === 'assigned-to-me' || view === 'following') items = items.filter((item) => item.assignee.id === 'u-recruiter');
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.patch('*/api/v1/work-items/:id', async ({ params, request }) => {
    const item = workFixtures.find((candidate) => candidate.id === params.id);
    if (!item) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy công việc' }, { status: 404 });
    const body = (await request.json()) as { version?: number; status?: typeof item.status; dueAt?: string; assigneeId?: string };
    if (body.version !== item.version) return HttpResponse.json({ code: 'VERSION_CONFLICT', message: 'Dữ liệu vừa được cập nhật' }, { status: 409 });
    Object.assign(item, { ...body, version: item.version + 1, assignee: body.assigneeId ? { id: body.assigneeId, name: assignees.get(body.assigneeId) ?? item.assignee.name } : item.assignee, updatedAt: new Date().toISOString() });
    return HttpResponse.json(item);
  })
];

