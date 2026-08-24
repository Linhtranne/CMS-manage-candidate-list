import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { TaskService, type TaskScopeContext } from '../application/task.service.js';
import { AssignTaskDto, CreateTaskDto, VersionedTaskActionDto } from './task.dto.js';

@Controller('tasks')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('task.view')
export class TasksController {
  constructor(private readonly tasks: TaskService) {}

  @Get()
  async list(@Query('status') status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | undefined, @Query('assigneeUserId') assigneeUserId: string | undefined, @Req() request: AuthenticatedRequest) {
    return { items: await this.tasks.list({ status, assigneeUserId }, this.context(request)) };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.tasks.get(id, this.context(request));
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async create(@Body() body: CreateTaskDto, @Req() request: AuthenticatedRequest) {
    return this.tasks.create({
      title: body.title,
      description: body.description,
      assigneeUserId: body.assigneeUserId,
      teamId: body.teamId ?? null,
      waitingOn: body.waitingOn as never ?? null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      noDueDateReason: body.noDueDateReason ?? null,
      ruleCode: body.ruleCode ?? null,
      sourceEventId: body.sourceEventId ?? null,
      dedupeKey: body.dedupeKey ?? null,
      reference: { entityType: body.referenceEntityType, entityId: body.referenceEntityId },
    }, this.context(request));
  }

  @Post(':id/assignment')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.assign')
  async assign(@Param('id') id: string, @Body() body: AssignTaskDto, @Req() request: AuthenticatedRequest) {
    return this.tasks.assign(id, { assigneeUserId: body.assigneeUserId, teamId: body.teamId ?? null }, body.version, this.context(request));
  }

  @Post(':id/start')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async start(@Param('id') id: string, @Body() body: VersionedTaskActionDto, @Req() request: AuthenticatedRequest) {
    return this.tasks.start(id, body.version, this.context(request));
  }

  @Post(':id/completion')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async complete(@Param('id') id: string, @Body() body: VersionedTaskActionDto, @Req() request: AuthenticatedRequest) {
    return this.tasks.complete(id, body.version, this.context(request));
  }

  @Post(':id/cancellation')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async cancel(@Param('id') id: string, @Body() body: VersionedTaskActionDto, @Req() request: AuthenticatedRequest) {
    return this.tasks.cancel(id, body.version, body.reason ?? '', this.context(request));
  }

  private context(request: AuthenticatedRequest): TaskScopeContext {
    const context = getRequestContext();
    const teamScoped = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? ''));
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: teamScoped ? 'TEAM' : 'SELF', correlationId: context?.correlationId ?? 'unknown-correlation' };
  }
}

/** Compatibility surface for the OpenAPI work-item contract consumed by the web app. */
@Controller('work-items')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('task.view')
export class WorkItemsController {
  constructor(private readonly tasks: TaskService) {}

  @Get()
  async list(@Query('status') status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | undefined, @Req() request: AuthenticatedRequest) {
    const items = await this.tasks.list({ status }, this.context(request));
    return { items: items.map(toWorkItem) };
  }

  @Get('summary')
  async summary(@Req() request: AuthenticatedRequest) {
    const items = await this.tasks.list({}, this.context(request));
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return { summary: {
      overdue: items.filter((item) => item.dueAt && item.dueAt.getTime() < now && item.status !== 'DONE' && item.status !== 'CANCELLED').length,
      today: items.filter((item) => item.dueAt && item.dueAt.getTime() >= now && item.dueAt.getTime() < now + day).length,
      waitingReply: items.filter((item) => item.waitingOn === 'CANDIDATE' || item.waitingOn === 'CLIENT_PARTNER').length,
      unresolvedEmail: items.filter((item) => item.reference.entityType.toLowerCase().includes('email')).length,
      journeyRisk: items.filter((item) => item.reference.entityType.toLowerCase().includes('journey')).length,
    } };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return toWorkItem(await this.tasks.get(id, this.context(request)));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async update(@Param('id') id: string, @Body() body: { status?: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; version: number; reason?: string; assigneeId?: string }, @Req() request: AuthenticatedRequest) {
    const context = this.context(request);
    const updated = body.assigneeId
      ? await this.tasks.assign(id, { assigneeUserId: body.assigneeId, teamId: request.auth!.teamId ?? null }, body.version, context)
      : body.status === 'DONE'
        ? await this.tasks.complete(id, body.version, context)
        : body.status === 'IN_PROGRESS'
          ? await this.tasks.start(id, body.version, context)
          : body.status === 'CANCELLED'
            ? await this.tasks.cancel(id, body.version, body.reason ?? '', context)
            : await this.tasks.get(id, context);
    return toWorkItem(updated);
  }

  private context(request: AuthenticatedRequest): TaskScopeContext {
    const context = getRequestContext();
    const teamScoped = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? ''));
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: teamScoped ? 'TEAM' : 'SELF', correlationId: context?.correlationId ?? 'unknown-correlation' };
  }
}

function toWorkItem(item: Awaited<ReturnType<TaskService['get']>>) {
  const reference = item.reference;
  const dueAt = item.dueAt ?? item.updatedAt;
  const priority = item.dueAt && item.dueAt.getTime() < Date.now() ? 'URGENT' : item.dueAt && item.dueAt.getTime() < Date.now() + 2 * 24 * 60 * 60 * 1000 ? 'HIGH' : 'NORMAL';
  return {
    id: item.id, title: item.title, priority, status: item.status, dueAt: dueAt.toISOString(),
    assignee: { id: item.assigneeUserId, name: item.assigneeUserId }, sourceType: reference.entityType, sourceLabel: reference.entityId,
    candidate: { id: reference.entityId, code: reference.entityId, name: reference.entityId }, order: { id: reference.entityId, code: reference.entityId, position: '—' }, client: { id: reference.entityId, name: '—' },
    updatedAt: item.updatedAt.toISOString(), version: item.version, lastActivity: item.updatedAt.toISOString(), notes: item.description ?? '', waitingOn: item.waitingOn ?? 'NONE',
  };
}
