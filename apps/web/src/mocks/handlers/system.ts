import { http, HttpResponse } from 'msw';
import { configAdminFixture, coordinatorFixture, managerFixture, recruiterFixture } from '../fixtures/users';

function currentUser(request: Request) {
  const role = request.headers.get('x-e2e-role');
  return role === 'manager' ? managerFixture : role === 'coordinator' ? coordinatorFixture : role === 'config-admin' ? configAdminFixture : recruiterFixture;
}

export const systemHandlers = [
  http.get('*/api/v1/me', ({ request }) => HttpResponse.json(currentUser(request))),
  http.patch('*/api/v1/me', async ({ request }) => {
    const body = await request.json() as { displayName?: string };
    const user = currentUser(request);
    return HttpResponse.json({ ...user, ...(body.displayName ? { displayName: body.displayName.trim() } : {}) });
  }),
  http.get('*/api/v1/auth/csrf', () => HttpResponse.json({ token: 'mock-csrf-token' }))
];
