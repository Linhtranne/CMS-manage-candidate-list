import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { JourneyCompletionService } from '../application/journey-completion.service.js';
import type { JourneyScopeContext } from '../application/supply-journey.service.js';
import { JourneyLifecycleCommandDto } from './journey-lifecycle.dto.js';
import { serializeJourney } from './journey-response.js';

@Controller('supply-journeys')
@UseGuards(SessionGuard, PolicyGuard)
export class JourneyLifecycleController {
  constructor(private readonly lifecycle: JourneyCompletionService, private readonly prisma: PrismaService) {}
  @Get(':id') @RequirePermission('supply_journey.view') async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return serializeJourney(this.prisma, await this.lifecycle.get(id, this.context(request)), { detail: true }); }
  @Post(':id/hold') @UseGuards(CsrfGuard) @RequirePermission('supply_journey.update_milestone') hold(@Param('id') id: string, @Body() body: JourneyLifecycleCommandDto, @Req() request: AuthenticatedRequest) { return this.lifecycle.hold(id, body.version, body.reason ?? '', this.context(request)); }
  @Post(':id/resume') @UseGuards(CsrfGuard) @RequirePermission('supply_journey.update_milestone') resume(@Param('id') id: string, @Body() body: JourneyLifecycleCommandDto, @Req() request: AuthenticatedRequest) { return this.lifecycle.resume(id, body.version, this.context(request)); }
  @Post(':id/cancellation') @UseGuards(CsrfGuard) @RequirePermission('supply_journey.update_milestone') cancel(@Param('id') id: string, @Body() body: JourneyLifecycleCommandDto, @Req() request: AuthenticatedRequest) { return this.lifecycle.cancel(id, body.version, body.reason ?? '', this.context(request)); }
  @Post(':id/completion') @UseGuards(CsrfGuard) @RequirePermission('supply_journey.complete') complete(@Param('id') id: string, @Body() body: JourneyLifecycleCommandDto, @Req() request: AuthenticatedRequest) { return this.lifecycle.complete(id, body.version, this.context(request)); }
  private context(request: AuthenticatedRequest): JourneyScopeContext { const rc = getRequestContext(); const team = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')); return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: team ? 'TEAM' : 'SELF', requestId: rc?.requestId ?? 'unknown-request', correlationId: rc?.correlationId ?? 'unknown-correlation' }; }
}
