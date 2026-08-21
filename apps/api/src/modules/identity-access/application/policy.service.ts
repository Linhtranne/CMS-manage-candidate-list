import { Injectable } from '@nestjs/common';
import {
  APPROVAL_REQUIRED_ACTIONS,
  PERMISSION_ACTIONS,
  REASON_REQUIRED_ACTIONS,
  ROLE_ACTION_SCOPES,
  type ActorContext,
  type AuthorizationInput,
  type PermissionAction,
  type ScopeAttributes,
  type ScopeLevel,
} from '../domain/permission.registry.js';

export interface AuthorizationDecision {
  allowed: true;
  scope: ScopeLevel;
}

export class AuthorizationDeniedError extends Error {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  readonly messageKey = 'errors.forbidden';

  constructor(reason: string) {
    super(`FORBIDDEN: ${reason}`);
    this.name = 'AuthorizationDeniedError';
  }
}

function scopeMatches(actor: ActorContext, scope: ScopeLevel, resource: ScopeAttributes): boolean {
  if (scope === 'COMPANY') return true;
  if (scope === 'SELF' || scope === 'ASSIGNED') return resource.ownerUserId === actor.userId;
  if (scope === 'TEAM') return Boolean(actor.teamId && resource.teamId === actor.teamId);
  return Boolean(actor.departmentId && resource.departmentId === actor.departmentId);
}

function isSensitiveAction(action: PermissionAction): boolean {
  return action.endsWith('.view_sensitive') || action.endsWith('.download_sensitive');
}

const SCOPE_RANK: Record<ScopeLevel, number> = {
  SELF: 0,
  ASSIGNED: 1,
  TEAM: 2,
  DEPARTMENT: 3,
  COMPANY: 4,
};

function effectiveScope(role: ActorContext['roles'][number], action: PermissionAction): ScopeLevel | undefined {
  const configured = ROLE_ACTION_SCOPES[role.code]?.[action];
  if (!configured) return undefined;
  if (!role.scope) return configured;
  return SCOPE_RANK[role.scope] <= SCOPE_RANK[configured] ? role.scope : configured;
}

@Injectable()
export class PolicyService {
  assert(input: AuthorizationInput): AuthorizationDecision {
    if (input.actor.status && input.actor.status !== 'ACTIVE') throw new AuthorizationDeniedError('ACTOR_NOT_ACTIVE');
    if (!PERMISSION_ACTIONS.includes(input.action)) throw new AuthorizationDeniedError('UNKNOWN_ACTION');
    if (input.sensitivity === 'HIGHLY_SENSITIVE' && !isSensitiveAction(input.action)) {
      throw new AuthorizationDeniedError('SENSITIVITY_REQUIRES_EXPLICIT_ACTION');
    }
    if (REASON_REQUIRED_ACTIONS.has(input.action) && !input.reason?.trim()) throw new AuthorizationDeniedError('REASON_REQUIRED');
    if (APPROVAL_REQUIRED_ACTIONS.has(input.action) && !input.approvalId?.trim()) throw new AuthorizationDeniedError('APPROVAL_REQUIRED');

    const resource = input.resource;
    for (const role of input.actor.roles) {
      const scope = effectiveScope(role, input.action);
      if (!scope) continue;
      if (!resource || scopeMatches(input.actor, scope, resource)) return { allowed: true, scope };
    }
    throw new AuthorizationDeniedError('SCOPE_OR_ROLE_DENIED');
  }

  scopeFilter(actor: ActorContext, action: PermissionAction): Record<string, unknown> {
    const clauses: Array<Record<string, string>> = [];
    for (const role of actor.roles) {
      const effective = effectiveScope(role, action);
      if (!effective) continue;
      if (effective === 'COMPANY') return {};
      if (effective === 'SELF' || effective === 'ASSIGNED') clauses.push({ ownerUserId: actor.userId });
      if (effective === 'TEAM' && actor.teamId) clauses.push({ teamId: actor.teamId });
      if (effective === 'DEPARTMENT' && actor.departmentId) clauses.push({ departmentId: actor.departmentId });
    }
    return clauses.length ? { OR: clauses } : { id: '__DENY_ALL__' };
  }
}
