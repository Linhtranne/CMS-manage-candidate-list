import { http, HttpResponse } from 'msw';
import { configAdminFixture, coordinatorFixture, managerFixture, recruiterFixture } from '../fixtures/users';

function currentUser(request: Request) {
  const role = request.headers.get('x-e2e-role');
  return role === 'manager' ? managerFixture : role === 'coordinator' ? coordinatorFixture : role === 'config-admin' ? configAdminFixture : recruiterFixture;
}

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
    if (body.email !== 'staff@example.com' || body.password !== 'secret') {
      return HttpResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Thông tin đăng nhập không hợp lệ' }, { status: 401 });
    }
    return HttpResponse.json({ user: currentUser(request), expiresAt: new Date(Date.now() + 3_600_000).toISOString() });
  }),
  http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 }))
];
