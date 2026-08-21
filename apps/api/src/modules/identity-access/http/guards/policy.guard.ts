import { Injectable, Optional, type CanActivate, type ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyService } from '../../application/policy.service.js';
import { SessionAuthenticationError } from '../../application/session.service.js';
import { AuditWriter } from '../../../../modules/audit/audit-writer.js';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../../platform/http/request-context.middleware.js';
import type { PermissionAction, Sensitivity } from '../../domain/permission.registry.js';
import type { AuthenticatedRequest } from './session.guard.js';

export const POLICY_METADATA = 'cms:policy';
export interface PolicyMetadata {
  action: PermissionAction;
  sensitivity: Sensitivity;
}

export const RequirePermission = (action: PermissionAction, sensitivity: Sensitivity = 'NORMAL') =>
  SetMetadata(POLICY_METADATA, { action, sensitivity } satisfies PolicyMetadata);

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policy: PolicyService,
    @Optional() private readonly audit?: AuditWriter,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<PolicyMetadata>(POLICY_METADATA, [context.getHandler(), context.getClass()]);
    if (!metadata) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) throw new SessionAuthenticationError();
    try {
      const body = request.body && typeof request.body === 'object' ? request.body as Record<string, unknown> : {};
      this.policy.assert({
        actor: {
          userId: request.auth.userId,
          status: request.auth.user.status as 'ACTIVE',
          teamId: request.auth.teamId,
          roles: request.auth.roles,
        },
        action: metadata.action,
        sensitivity: metadata.sensitivity,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        approvalId: typeof body.approvalId === 'string' ? body.approvalId : undefined,
      });
    } catch (error) {
      if (this.audit && this.prisma) {
        try {
          await this.prisma.$transaction(async (tx) => this.audit!.append(tx, {
            actorUserId: request.auth!.userId,
            sessionId: request.auth!.sessionId,
            action: 'AUTHZ_DENIED',
            entityType: 'PERMISSION',
            entityId: metadata.action,
            correlationId: getRequestContext()?.correlationId ?? request.auth!.sessionId,
            metadataJson: { sensitivity: metadata.sensitivity, reason: error instanceof Error ? error.name : 'POLICY_DENIED' },
          }));
        } catch {
          // Preserve the original authorization denial; audit persistence must not turn a 403 into a 500.
        }
      }
      throw error;
    }
    return true;
  }
}
