import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/platform/config/config.schema.js';
import { SessionService } from '../../src/modules/identity-access/application/session.service.js';

describe('session provider contract', () => {
  it('returns the OpenAPI CurrentUser fields from a runtime session', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      SESSION_SECRET: '12345678901234567890123456789012',
    });
    const prisma = {
      user: {
        findUnique: async () => ({
          id: 'user-1',
          displayName: 'Internal User',
          email: 'user@example.invalid',
          status: 'ACTIVE',
          userRoles: [{ role: { code: 'RECRUITER' } }],
        }),
      },
      session: { create: async () => ({ id: 'session-1' }) },
    };
    const service = new SessionService(config, prisma as never);

    const created = await service.createSession('user-1');
    expect(created.user).toMatchObject({
      id: 'user-1',
      displayName: 'Internal User',
      roles: ['RECRUITER'],
      permissions: expect.arrayContaining(['candidate.view', 'candidate.create']),
    });
  });
});
