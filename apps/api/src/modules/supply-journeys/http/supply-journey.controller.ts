import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { SupplyJourneyService, type JourneyScopeContext } from '../application/supply-journey.service.js';
import { StartApplicationSupplyJourneyDto, StartSupplyJourneyDto } from './supply-journey.dto.js';
import { serializeJourney } from './journey-response.js';

@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class SupplyJourneyController {
  constructor(private readonly journeys: SupplyJourneyService, private readonly prisma: PrismaService) {}

  @Get('supply-journeys')
  @RequirePermission('supply_journey.view')
  async list(@Query('status') status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | undefined, @Query('ownerId') ownerId: string | undefined, @Req() request: AuthenticatedRequest) {
    const journeys = await this.journeysList(request, { status, ownerId });
    return { items: await Promise.all(journeys.map((journey) => serializeJourney(this.prisma, journey))) };
  }

  @Get('applications/:id/journey-eligibility')
  @RequirePermission('supply_journey.create')
  async eligibility(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.journeys.eligibility(id, this.context(request));
  }

  @Get('applications/:id/supply-journey-preview')
  @RequirePermission('supply_journey.create')
  async preview(@Param('id') id: string, @Query('templateVersionId') templateVersionId: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.journeys.previewStart(id, templateVersionId, this.context(request));
  }

  @Post('applications/:id/supply-journey/from-preview')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.create')
  async start(@Param('id') id: string, @Body() body: StartSupplyJourneyDto, @Req() request: AuthenticatedRequest) {
    return this.journeys.start(id, { previewToken: body.previewToken, idempotencyKey: body.idempotencyKey, ownerUserId: body.ownerUserId, startedAt: body.startedAt ? new Date(body.startedAt) : undefined }, this.context(request));
  }

  @Post('applications/:id/supply-journey')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.create')
  async startFromApplication(@Param('id') id: string, @Body() body: StartApplicationSupplyJourneyDto, @Req() request: AuthenticatedRequest) {
    return this.journeys.startFromApplication(id, { templateId: body.templateId, templateVersion: body.templateVersion, ownerUserId: body.ownerUserId, startedAt: new Date(body.startedAt) }, this.context(request));
  }

  private context(request: AuthenticatedRequest): JourneyScopeContext {
    const requestContext = getRequestContext();
    const teamScoped = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? ''));
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: teamScoped ? 'TEAM' : 'SELF', requestId: requestContext?.requestId ?? 'unknown-request', correlationId: requestContext?.correlationId ?? 'unknown-correlation' };
  }

  private journeysList(request: AuthenticatedRequest, filter: { status?: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'; ownerId?: string }) { return this.journeys.list(this.context(request), filter); }
}
