import { http, HttpResponse } from 'msw';
import { recruiterFixture } from '../fixtures/users';

export const systemHandlers = [
  http.get('*/api/v1/me', () => HttpResponse.json(recruiterFixture))
];
