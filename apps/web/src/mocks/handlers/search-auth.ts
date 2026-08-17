import { http, HttpResponse } from 'msw';
import { recruiterFixture } from '../fixtures/users';

export const searchAuthHandlers = [
  http.get('*/api/v1/search', ({ request }) => {
    const query = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    if (!query.includes('sakura')) {
      return HttpResponse.json({ items: [] });
    }

    return HttpResponse.json({
      items: [
        {
          id: 'client-sakura',
          type: 'client',
          typeLabel: 'Khách hàng',
          primaryText: 'Sakura Care Partners',
          secondaryText: 'Đơn hàng đang tuyển',
          href: '/clients/client-sakura'
        }
      ]
    });
  }),
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return HttpResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Thông tin đăng nhập không hợp lệ' }, { status: 401 });
    }
    return HttpResponse.json({ user: recruiterFixture, expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  }),
  http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 }))
];
