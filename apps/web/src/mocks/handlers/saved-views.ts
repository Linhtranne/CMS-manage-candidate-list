import { http, HttpResponse } from 'msw';

export const savedViewHandlers = [
  http.post('*/api/v1/saved-views', async ({ request }) => HttpResponse.json(await request.json(), { status: 201 })),
  http.get('*/api/v1/saved-views', () => HttpResponse.json({ items: [] })),
  http.patch('*/api/v1/saved-views/:id', async ({ request }) => HttpResponse.json(await request.json()))
];
