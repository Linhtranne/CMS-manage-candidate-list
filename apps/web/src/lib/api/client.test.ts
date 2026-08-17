// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { apiClient } from './client';

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
});
