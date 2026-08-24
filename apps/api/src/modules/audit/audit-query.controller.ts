import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PolicyGuard, RequirePermission } from '../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../identity-access/http/guards/session.guard.js';
import { AuditQueryService } from './audit-query.service.js';
@Controller('audit') @UseGuards(SessionGuard, PolicyGuard) @RequirePermission('audit.view')
export class AuditQueryController {
  constructor(private readonly audit: AuditQueryService) {}
  @Get('events') list(@Query('entityType') entityType: string | undefined, @Query('entityId') entityId: string | undefined, @Query('from') from: string | undefined, @Query('to') to: string | undefined, @Req() request: AuthenticatedRequest) { return this.audit.list({ entityType, entityId, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }, { actorId: request.auth!.userId, teamId: request.auth!.teamId }); }
}
