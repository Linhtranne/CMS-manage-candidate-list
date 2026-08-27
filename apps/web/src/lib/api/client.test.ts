// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { apiClient, normalizeApiResponse } from './client';

describe('apiClient', () => {
  it('exposes GET operations from the generated contract', () => {
    expect(apiClient.GET).toBeTypeOf('function');
  });

  it('reads the current internal user through the MSW contract handler', async () => {
    const { data, error } = await apiClient.GET('/me');

    expect(error).toBeUndefined();
    expect(data?.roles).toContain('RECRUITER');
    expect(data?.permissions).toContain('candidate:email');
  });

  it('unwraps the production envelope and carries page cursor for legacy consumers', async () => {
    const response = new Response(JSON.stringify({
      data: { items: [{ id: 'candidate-01' }] },
      page: { nextCursor: 'cursor-2', hasMore: true },
      requestId: 'req-123'
    }), { headers: { 'content-type': 'application/json' } });

    const normalized = await normalizeApiResponse(response);

    await expect(normalized.json()).resolves.toEqual({
      items: [{ id: 'candidate-01' }],
      nextCursor: 'cursor-2'
    });
  });

  it('maps structured API problems to the existing error shape', async () => {
    const response = new Response(JSON.stringify({
      error: { code: 'AUTH_REQUIRED', messageKey: 'errors.authRequired' },
      requestId: 'req-401'
    }), { status: 401, headers: { 'content-type': 'application/json' } });

    const normalized = await normalizeApiResponse(response);

    expect(normalized.status).toBe(401);
    await expect(normalized.json()).resolves.toEqual({
      code: 'AUTH_REQUIRED',
      messageKey: 'errors.authRequired',
      message: 'errors.authRequired',
      traceId: 'req-401'
    });
  });
});
