import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { clientFixtures } from '../fixtures/clients';
import { candidateMatchFixtures, orderFixtures, type JobOrder } from '../fixtures/orders';

type CreateClientRequest = components['schemas']['CreateClientRequest'];
type CreateOrderRequest = components['schemas']['CreateOrderRequest'];
type OrderStatusUpdate = components['schemas']['OrderStatusUpdate'];

const people = [
  { id: 'u-recruiter', name: 'Nguyễn Minh Anh' },
  { id: 'u-manager', name: 'Lê Thu Hà' },
  { id: 'u-coordinator', name: 'Trần Quốc Huy' }
];

export const clientsOrdersHandlers = [
  http.get('*/api/v1/clients', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const items = clientFixtures.filter((client) => (!query || `${client.code} ${client.name} ${client.industryLabels.join(' ')}`.toLowerCase().includes(query)) && (!status || client.status === status));
    return HttpResponse.json({ items });
  }),
  http.get('*/api/v1/clients/:id', ({ params }) => {
    const client = clientFixtures.find((item) => item.id === params.id);
    return client ? HttpResponse.json(client) : HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy khách hàng' }, { status: 404 });
  }),
  http.post('*/api/v1/clients', async ({ request }) => {
    const body = (await request.json()) as CreateClientRequest;
    const owner = people.find((person) => person.id === body.ownerId) ?? people[0];
    const client = {
      id: `client-${clientFixtures.length + 1}`,
      code: `KH-${String(clientFixtures.length + 1).padStart(3, '0')}`,
      name: body.name,
      organizationType: body.organizationType,
      industryLabels: body.industryLabels,
      owner,
      activeOrders: 0,
      target: 0,
      passed: 0,
      lastActivity: new Date().toISOString(),
      status: 'PROSPECT' as const,
      region: body.region,
      contactName: body.contactName ?? undefined,
      notes: body.notes ?? undefined,
      version: 1
    };
    clientFixtures.push(client);
    return HttpResponse.json(client, { status: 201 });
  }),
  http.patch('*/api/v1/clients/:id', async ({ params, request }) => {
    const client = clientFixtures.find((item) => item.id === params.id);
    if (!client) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy khách hàng' }, { status: 404 });
    const body = await request.json() as components['schemas']['ClientUpdateRequest'];
    if (body.version !== client.version) return HttpResponse.json({ code: 'VERSION_CONFLICT', message: 'Khách hàng vừa được cập nhật, hãy tải lại.' }, { status: 409 });
    Object.assign(client, { name: body.name, organizationType: body.organizationType, industryLabels: body.industryLabels, region: body.region, contactName: body.contactName ?? undefined, notes: body.notes ?? undefined, status: body.status ?? client.status, lastActivity: new Date().toISOString(), version: client.version + 1 });
    return HttpResponse.json(client);
  }),
  http.get('*/api/v1/orders', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const industry = url.searchParams.get('industry');
    const status = url.searchParams.get('status');
    const items = orderFixtures.filter((order) => (!query || `${order.code} ${order.position} ${order.client.name}`.toLowerCase().includes(query)) && (!industry || order.industryLabel === industry) && (!status || order.status === status));
    return HttpResponse.json({ items });
  }),
  http.get('*/api/v1/orders/:id', ({ params }) => {
    const order = orderFixtures.find((item) => item.id === params.id);
    return order ? HttpResponse.json(order) : HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy đơn tuyển' }, { status: 404 });
  }),
  http.post('*/api/v1/orders', async ({ request }) => {
    const body = (await request.json()) as CreateOrderRequest;
    const client = clientFixtures.find((item) => item.id === body.clientId);
    if (!client) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy khách hàng' }, { status: 404 });
    const owner = people.find((person) => person.id === body.ownerId) ?? people[0];
    const order = {
      id: `order-${orderFixtures.length + 1}`,
      code: `ORD-${body.industryLabel.slice(0, 4).toUpperCase()}-${String(orderFixtures.length + 1).padStart(2, '0')}`,
      position: body.position,
      client: { id: client.id, name: client.name },
      industryLabel: body.industryLabel,
      occupation: body.occupation,
      location: body.location,
      target: body.target,
      deadline: body.deadline,
      owner,
      status: 'DRAFT' as const,
      metrics: { target: body.target, activeApplications: 0, passed: 0, supplied: 0 },
      health: 'UNDER_TARGET' as const,
      version: 1,
      salary: body.salary ?? '',
      contractType: body.contractType ?? '',
      japaneseLevel: body.japaneseLevel ?? '',
      criteria: body.criteria ?? []
    };
    orderFixtures.push(order);
    return HttpResponse.json(order, { status: 201 });
  }),
  http.patch('*/api/v1/orders/:id/status', async ({ params, request }) => {
    const order = orderFixtures.find((item) => item.id === params.id);
    if (!order) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy đơn tuyển' }, { status: 404 });
    const body = (await request.json()) as OrderStatusUpdate;
    if (body.version !== order.version) return HttpResponse.json({ code: 'VERSION_CONFLICT', message: 'Đơn tuyển vừa được cập nhật, hãy tải lại.' }, { status: 409 });
    const allowed: Record<JobOrder['status'], JobOrder['status'][]> = { DRAFT: ['DRAFT', 'RECRUITING'], RECRUITING: ['RECRUITING', 'PAUSED', 'FILLED'], PAUSED: ['PAUSED', 'RECRUITING', 'FILLED'], FILLED: ['FILLED', 'CLOSED'], CLOSED: ['CLOSED'] };
    if (!allowed[order.status].includes(body.status)) return HttpResponse.json({ code: 'INVALID_TRANSITION', message: 'Trạng thái không hợp lệ theo lộ trình DRAFT → RECRUITING → PAUSED → FILLED → CLOSED.' }, { status: 422 });
    order.status = body.status;
    order.version += 1;
    if (body.status === 'FILLED') order.health = 'FILLED';
    return HttpResponse.json(order);
  }),
  http.get('*/api/v1/candidates/search-for-order', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const industry = (url.searchParams.get('industry') ?? '').toLowerCase();
    const occupation = (url.searchParams.get('occupation') ?? '').toLowerCase();
    const skill = (url.searchParams.get('skill') ?? '').toLowerCase();
    const japaneseLevel = url.searchParams.get('japaneseLevel');
    const readiness = (url.searchParams.get('readiness') ?? '').toLowerCase();
    const hasActiveJourney = url.searchParams.get('hasActiveJourney');
    const items = candidateMatchFixtures.filter((candidate) => (!query || `${candidate.code} ${candidate.name} ${candidate.occupation} ${(candidate.skills ?? []).join(' ')}`.toLowerCase().includes(query)) && (!industry || candidate.industryLabel.toLowerCase() === industry) && (!occupation || candidate.occupation.toLowerCase().includes(occupation)) && (!skill || (candidate.skills ?? []).some((item) => item.toLowerCase().includes(skill))) && (!japaneseLevel || candidate.japaneseLevel === japaneseLevel) && (!readiness || candidate.readiness.toLowerCase().includes(readiness)) && (!hasActiveJourney || String(candidate.hasActiveJourney) === hasActiveJourney));
    return HttpResponse.json({ items });
  }),
  http.post('*/api/v1/orders/:id/applications', async ({ params, request }) => {
    const body = (await request.json()) as { candidateIds?: string[] };
    const duplicates = (body.candidateIds ?? []).filter((id) => candidateMatchFixtures.find((candidate) => candidate.id === id)?.hasActiveApplicationInOrder);
    if (duplicates.length) return HttpResponse.json({ code: 'DUPLICATE_APPLICATION', message: 'Ứng viên đã có trong đơn tuyển' }, { status: 409 });
    return HttpResponse.json({ createdApplicationIds: (body.candidateIds ?? []).map((id) => `application-${params.id}-${id}`) }, { status: 201 });
  })
];

