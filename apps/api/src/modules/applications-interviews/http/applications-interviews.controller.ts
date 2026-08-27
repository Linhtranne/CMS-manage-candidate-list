import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { ApplicationService } from '../application/application.service.js';
import { InterviewService } from '../application/interview.service.js';
import { AddCandidatesToOrderDto, ApplicationDecisionDto, ApplicationTransitionDto, CancelInterviewDto, CreateInterviewDto, RescheduleInterviewDto, SaveInterviewResultDto } from './applications-interviews.dto.js';

@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class ApplicationsInterviewsController {
  constructor(private readonly applications: ApplicationService, private readonly interviews: InterviewService) {}

  @Post('orders/:id/applications')
  @UseGuards(CsrfGuard)
  @RequirePermission('application.create')
  async addCandidates(@Param('id') orderId: string, @Body() body: AddCandidatesToOrderDto, @Req() request: AuthenticatedRequest) {
    return { createdApplicationIds: await this.applications.createMany(orderId, body.candidateIds, body.source, this.context(request)) };
  }

  @Get('applications')
  @RequirePermission('application.view')
  list(@Query() query: { query?: string; view?: string; orderId?: string; cursor?: string }, @Req() request: AuthenticatedRequest) { return this.applications.list(query, this.context(request)); }

  @Get('views/waiting-interviews')
  @RequirePermission('application.view')
  waitingInterviews(@Query() query: { query?: string; orderId?: string; cursor?: string }, @Req() request: AuthenticatedRequest) { return this.applications.list({ ...query, view: 'waiting-interview' }, this.context(request)); }

  @Get('views/interviewed')
  @RequirePermission('application.view')
  interviewed(@Query() query: { query?: string; orderId?: string; cursor?: string }, @Req() request: AuthenticatedRequest) { return this.applications.list({ ...query, view: 'interviewed' }, this.context(request)); }

  @Get('views/passed-applications')
  @RequirePermission('application.view')
  passedApplications(@Query() query: { query?: string; orderId?: string; cursor?: string }, @Req() request: AuthenticatedRequest) { return this.applications.list({ ...query, view: 'passed' }, this.context(request)); }

  @Get('applications/:id')
  @RequirePermission('application.view')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.applications.get(id, this.context(request)); }

  @Patch('applications/:id/status')
  @UseGuards(CsrfGuard)
  @RequirePermission('application.update')
  transition(@Param('id') id: string, @Body() body: ApplicationTransitionDto, @Req() request: AuthenticatedRequest) { return this.applications.transition(id, body.status, body.version, body.reason, this.context(request)); }

  @Post('applications/:id/decisions')
  @UseGuards(CsrfGuard)
  @RequirePermission('application.decide')
  decision(@Param('id') id: string, @Body() body: ApplicationDecisionDto, @Req() request: AuthenticatedRequest) { return this.applications.transition(id, body.status, body.version, body.note ?? body.reasonCode, this.context(request)); }

  @Post('applications/:id/withdrawals')
  @UseGuards(CsrfGuard)
  @RequirePermission('application.update')
  withdraw(@Param('id') id: string, @Body() body: ApplicationTransitionDto, @Req() request: AuthenticatedRequest) { return this.applications.transition(id, 'WITHDRAWN', body.version, body.reason, this.context(request)); }

  @Post('applications/:id/interviews')
  @UseGuards(CsrfGuard)
  @RequirePermission('interview.schedule')
  createInterview(@Param('id') applicationId: string, @Body() body: CreateInterviewDto, @Req() request: AuthenticatedRequest) { return this.interviews.create(applicationId, this.scheduleInput(body), this.context(request)); }

  @Post('applications/:id/interviews/:interviewId/reschedules')
  @UseGuards(CsrfGuard)
  @RequirePermission('interview.schedule')
  reschedule(@Param('id') applicationId: string, @Param('interviewId') interviewId: string, @Body() body: RescheduleInterviewDto, @Req() request: AuthenticatedRequest) { return this.interviews.reschedule(applicationId, interviewId, { ...this.scheduleInput(body), reason: body.reason }, body.version, this.context(request)); }

  @Post('applications/:id/interviews/:interviewId/cancellation')
  @UseGuards(CsrfGuard)
  @RequirePermission('interview.schedule')
  cancel(@Param('id') applicationId: string, @Param('interviewId') interviewId: string, @Body() body: CancelInterviewDto, @Req() request: AuthenticatedRequest) { return this.interviews.cancel(applicationId, interviewId, body.version, body.reason, 'CANCELLED', this.context(request)); }

  @Post('applications/:id/interviews/:interviewId/no-show')
  @UseGuards(CsrfGuard)
  @RequirePermission('interview.schedule')
  noShow(@Param('id') applicationId: string, @Param('interviewId') interviewId: string, @Body() body: CancelInterviewDto, @Req() request: AuthenticatedRequest) { return this.interviews.cancel(applicationId, interviewId, body.version, body.reason, 'NO_SHOW', this.context(request)); }

  @Post('applications/:id/interviews/:interviewId/results')
  @UseGuards(CsrfGuard)
  @RequirePermission('interview.record_result')
  result(@Param('id') applicationId: string, @Param('interviewId') interviewId: string, @Body() body: SaveInterviewResultDto, @Req() request: AuthenticatedRequest) { return this.interviews.complete(applicationId, interviewId, { result: body.result, feedback: body.feedback, strengths: body.strengths, concerns: body.concerns, nextStep: body.nextStep }, body.version, this.context(request)); }

  @Get('interviews/:id/question-snapshots')
  @RequirePermission('interview.schedule')
  snapshot(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.interviews.questionSnapshot(id, this.context(request)); }

  private scheduleInput(body: CreateInterviewDto) { return { scheduledAt: new Date(body.scheduledAt), scheduledEndAt: new Date(body.scheduledEndAt), timeZone: body.timeZone, mode: body.mode, meetingUrl: body.meetingUrl, location: body.location, participants: body.participants }; }
  private context(request: AuthenticatedRequest) { const ctx = getRequestContext(); return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')) ? 'TEAM' as const : 'SELF' as const, requestId: ctx?.requestId ?? 'unknown-request', correlationId: ctx?.correlationId ?? 'unknown-correlation' }; }
}
