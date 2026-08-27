import { describe, expect, it, vi } from 'vitest';
import { AuthorizationDeniedError } from '../../src/modules/identity-access/application/policy.service.js';
import { PolicyGuard } from '../../src/modules/identity-access/http/guards/policy.guard.js';

function context(request: unknown) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

const auth = {
  userId: 'user-1',
  sessionId: 'session-1',
  teamId: 'team-1',
  roles: [{ code: 'RECRUITER', scope: 'TEAM' as const }],
  user: { status: 'ACTIVE' },
};

describe('policy guard audit boundary', () => {
  it('audits a denied authenticated request and preserves the 403 error', async () => {
    const denied = new AuthorizationDeniedError('SCOPE_OR_ROLE_DENIED');
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ action: 'candidate.view', sensitivity: 'NORMAL' }) };
    const policy = { assert: vi.fn(() => { throw denied; }) };
    const audit = { append: vi.fn() };
    const prisma = { $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})) };
    const guard = new PolicyGuard(reflector as never, policy as never, audit as never, prisma as never);

    await expect(guard.canActivate(context({ auth }))).rejects.toBe(denied);
    expect(audit.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: 'AUTHZ_DENIED',
      actorUserId: 'user-1',
      sessionId: 'session-1',
    }));
  });

  it('does not replace the authorization error when audit persistence fails', async () => {
    const denied = new AuthorizationDeniedError('SCOPE_OR_ROLE_DENIED');
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ action: 'candidate.view', sensitivity: 'NORMAL' }) };
    const policy = { assert: vi.fn(() => { throw denied; }) };
    const prisma = { $transaction: vi.fn().mockRejectedValue(new Error('AUDIT_DB_DOWN')) };
    const guard = new PolicyGuard(reflector as never, policy as never, { append: vi.fn() } as never, prisma as never);

    await expect(guard.canActivate(context({ auth }))).rejects.toBe(denied);
  });

  it('forwards command reason and approval reference to the policy service', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue({ action: 'candidate.archive', sensitivity: 'NORMAL' }) };
    const policy = { assert: vi.fn(() => ({ allowed: true, scope: 'TEAM' })) };
    const guard = new PolicyGuard(reflector as never, policy as never);

    await expect(guard.canActivate(context({ auth, body: { reason: 'duplicate reviewed', approvalId: 'APR-123' } }))).resolves.toBe(true);
    expect(policy.assert).toHaveBeenCalledWith(expect.objectContaining({ reason: 'duplicate reviewed', approvalId: 'APR-123' }));
  });
});
