import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PolicyService } from '../application/policy.service.js';
import { PolicyGuard, RequirePermission } from './guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from './guards/session.guard.js';

@Controller('authz')
@UseGuards(SessionGuard, PolicyGuard)
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}

  @Get('audit-scope')
  @RequirePermission('audit.view')
  getAuditScope(@Req() request: AuthenticatedRequest) {
    const auth = request.auth!;
    return { filter: this.policy.scopeFilter({ userId: auth.userId, teamId: auth.teamId, roles: auth.roles }, 'audit.view') };
  }
}
