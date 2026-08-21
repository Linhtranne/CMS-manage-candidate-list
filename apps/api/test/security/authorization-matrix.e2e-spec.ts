import { describe, expect, it } from 'vitest';
import { PolicyService, AuthorizationDeniedError } from '../../src/modules/identity-access/application/policy.service.js';

const recruiter = { userId: 'u-recruiter', teamId: 'team-a', departmentId: 'dept-a', roles: [{ code: 'RECRUITER', scope: 'TEAM' as const }] };
const manager = { userId: 'u-manager', teamId: 'team-a', departmentId: 'dept-a', roles: [{ code: 'MANAGER', scope: 'DEPARTMENT' as const }] };
const configAdmin = { userId: 'u-admin', teamId: 'team-a', departmentId: 'dept-a', roles: [{ code: 'CONFIG_ADMIN', scope: 'COMPANY' as const }] };

describe('authorization matrix', () => {
  const policy = new PolicyService();

  it('allows team access and denies a cross-team resource', () => {
    expect(policy.assert({ actor: recruiter, action: 'candidate.view', resource: { teamId: 'team-a' }, sensitivity: 'NORMAL' }).allowed).toBe(true);
    expect(() => policy.assert({ actor: recruiter, action: 'candidate.view', resource: { teamId: 'team-b' }, sensitivity: 'NORMAL' })).toThrow(AuthorizationDeniedError);
  });

  it('keeps config admin separate from content permissions', () => {
    expect(() => policy.assert({ actor: configAdmin, action: 'candidate.view', resource: { teamId: 'team-a' }, sensitivity: 'NORMAL' })).toThrow(/FORBIDDEN/);
    expect(policy.assert({ actor: configAdmin, action: 'catalog.configure', resource: {}, sensitivity: 'NORMAL' }).allowed).toBe(true);
  });

  it('requires explicit sensitive action and reason/approval for high-risk commands', () => {
    expect(() => policy.assert({ actor: manager, action: 'candidate.view', resource: { departmentId: 'dept-a' }, sensitivity: 'HIGHLY_SENSITIVE' })).toThrow(/sensitivity/i);
    expect(policy.assert({ actor: manager, action: 'candidate.view_sensitive', resource: { departmentId: 'dept-a' }, sensitivity: 'HIGHLY_SENSITIVE' }).allowed).toBe(true);
    expect(() => policy.assert({ actor: manager, action: 'candidate.merge', resource: { departmentId: 'dept-a' }, sensitivity: 'NORMAL' })).toThrow(/reason/i);
    expect(policy.assert({ actor: manager, action: 'candidate.merge', resource: { departmentId: 'dept-a' }, sensitivity: 'NORMAL', reason: 'duplicate review', approvalId: 'approval-1' }).allowed).toBe(true);
  });

  it('permits route-level action checks without bypassing later scoped lookup', () => {
    expect(policy.assert({ actor: recruiter, action: 'candidate.view', sensitivity: 'NORMAL' }).allowed).toBe(true);
    expect(() => policy.assert({ actor: recruiter, action: 'candidate.view', resource: { teamId: 'team-b' }, sensitivity: 'NORMAL' })).toThrow(AuthorizationDeniedError);
  });

  it('does not allow a stored role scope to widen the approved action scope', () => {
    const widenedRecruiter = { ...recruiter, roles: [{ code: 'RECRUITER', scope: 'DEPARTMENT' as const }] };
    expect(() => policy.assert({ actor: widenedRecruiter, action: 'candidate.view', resource: { teamId: 'team-b', departmentId: 'dept-a' }, sensitivity: 'NORMAL' })).toThrow(AuthorizationDeniedError);
    expect(policy.scopeFilter(widenedRecruiter, 'candidate.view')).toEqual({ OR: [{ teamId: 'team-a' }] });
  });
});
