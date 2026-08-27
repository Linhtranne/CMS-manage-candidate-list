import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { JourneyMilestoneService, type MilestoneCommandContext } from '../application/journey-milestone.service.js';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MilestoneCommandDto, OpenMilestoneAttemptDto } from './journey-milestone.dto.js';

class UpdateMilestoneRouteDto extends MilestoneCommandDto { @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'NOT_APPLICABLE', 'WAIVED']) status!: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'NOT_APPLICABLE' | 'WAIVED'; @IsOptional() @IsString() naReason?: string; }

@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class JourneyMilestonesController {
  constructor(private readonly milestones: JourneyMilestoneService) {}

  @Get('journey-milestones/:id')
  @RequirePermission('supply_journey.view')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.milestones.get(id, this.context(request));
  }

  @Post('supply-journeys/:journeyId/milestones/:id/start')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  start(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.start(id, body.version, this.context(request));
  }

  @Patch('supply-journeys/:journeyId/milestones/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  update(@Param('id') id: string, @Body() body: UpdateMilestoneRouteDto, @Req() request: AuthenticatedRequest) {
    const context = this.context(request);
    if (body.status === 'IN_PROGRESS') return this.milestones.start(id, body.version, context);
    if (body.status === 'COMPLETED') return this.milestones.complete(id, body, body.version, context);
    if (body.status === 'BLOCKED') return this.milestones.block(id, body, body.version, context);
    if (body.status === 'NOT_APPLICABLE') return this.milestones.markNotApplicable(id, { ...body, reason: body.reason ?? body.naReason }, body.version, context);
    return this.milestones.get(id, context);
  }

  @Post('supply-journeys/:journeyId/milestones/:id/block')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  block(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.block(id, body, body.version, this.context(request));
  }

  @Post('supply-journeys/:journeyId/milestones/:id/complete')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  complete(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.complete(id, body, body.version, this.context(request));
  }

  @Post('supply-journeys/:journeyId/milestones/:id/waive')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.waive_milestone')
  waive(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.waive(id, body, body.version, { ...this.context(request), canWaive: true });
  }

  @Post('supply-journeys/:journeyId/milestones/:id/waiver')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.waive_milestone')
  waiver(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.waive(id, body, body.version, { ...this.context(request), canWaive: true });
  }

  @Post('supply-journeys/:journeyId/milestones/:id/not-applicable')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  notApplicable(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.markNotApplicable(id, body, body.version, this.context(request));
  }

  @Post('supply-journeys/:journeyId/milestones/:id/reopen')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.complete')
  reopen(@Param('id') id: string, @Body() body: MilestoneCommandDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.reopen(id, body, body.version, { ...this.context(request), canReopen: true });
  }

  @Post('journey-milestones/:id/attempts')
  @UseGuards(CsrfGuard)
  @RequirePermission('supply_journey.update_milestone')
  attempt(@Param('id') id: string, @Body() body: OpenMilestoneAttemptDto, @Req() request: AuthenticatedRequest) {
    return this.milestones.openAttempt(id, body.reason, this.context(request));
  }

  private context(request: AuthenticatedRequest): MilestoneCommandContext {
    const requestContext = getRequestContext();
    const teamScoped = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? ''));
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: teamScoped ? 'TEAM' : 'SELF', requestId: requestContext?.requestId ?? 'unknown-request', correlationId: requestContext?.correlationId ?? 'unknown-correlation' };
  }
}
