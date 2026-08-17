import { http, HttpResponse } from 'msw';
import { clientFixtures } from '../fixtures/clients';
import { candidateMatchFixtures, orderFixtures } from '../fixtures/orders';

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
  http.get('*/api/v1/orders', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const industry = url.searchParams.get('industry');
    const items = orderFixtures.filter((order) => (!query || `${order.code} ${order.position} ${order.client.name}`.toLowerCase().includes(query)) && (!industry || order.industryLabel === industry));
    return HttpResponse.json({ items });
  }),
  http.get('*/api/v1/orders/:id', ({ params }) => {
    const order = orderFixtures.find((item) => item.id === params.id);
    return order ? HttpResponse.json(order) : HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy đơn tuyển' }, { status: 404 });
  }),
  http.get('*/api/v1/candidates/search-for-order', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const items = candidateMatchFixtures.filter((candidate) => !query || `${candidate.code} ${candidate.name} ${candidate.occupation}`.toLowerCase().includes(query));
    return HttpResponse.json({ items });
  }),
  http.post('*/api/v1/orders/:id/applications', async ({ params, request }) => {
    const body = (await request.json()) as { candidateIds?: string[] };
    const duplicates = (body.candidateIds ?? []).filter((id) => candidateMatchFixtures.find((candidate) => candidate.id === id)?.hasActiveApplicationInOrder);
    if (duplicates.length) return HttpResponse.json({ code: 'DUPLICATE_APPLICATION', message: 'Ứng viên đã có trong đơn tuyển' }, { status: 409 });
    return HttpResponse.json({ createdApplicationIds: (body.candidateIds ?? []).map((id) => `application-${params.id}-${id}`) }, { status: 201 });
  })
];

