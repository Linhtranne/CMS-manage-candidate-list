import { http, HttpResponse } from 'msw';

type SavedView = {
  id: string;
  resource: string;
  name: string;
  query: Record<string, string | string[]>;
  visibility: 'PRIVATE' | 'TEAM';
  createdAt: string;
};

const savedViews = new Map<string, SavedView>();

export const savedViewHandlers = [
  http.post('*/api/v1/saved-views', async ({ request }) => {
    const body = await request.json() as Omit<SavedView, 'id' | 'createdAt'>;
    const item: SavedView = { ...body, id: `saved-view-${savedViews.size + 1}`, createdAt: new Date().toISOString() };
    savedViews.set(item.id, item);
    return HttpResponse.json(item, { status: 201 });
  }),
  http.get('*/api/v1/saved-views', ({ request }) => {
    const resource = new URL(request.url).searchParams.get('resource');
    return HttpResponse.json({ items: [...savedViews.values()].filter((item) => !resource || item.resource === resource) });
  }),
  http.patch('*/api/v1/saved-views/:id', async ({ params, request }) => {
    const existing = savedViews.get(String(params.id));
    if (!existing) return HttpResponse.json({ code: 'NOT_FOUND', message: 'Không tìm thấy view đã lưu.' }, { status: 404 });
    const body = await request.json() as Omit<SavedView, 'id' | 'createdAt'>;
    const updated = { ...existing, ...body };
    savedViews.set(existing.id, updated);
    return HttpResponse.json(updated);
  })
];
