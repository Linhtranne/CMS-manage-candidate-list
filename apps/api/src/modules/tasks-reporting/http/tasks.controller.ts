import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { TaskService, type TaskScopeContext } from '../application/task.service.js';
import { AssignTaskDto, CreateTaskDto, CreateWorkItemDto, VersionedTaskActionDto } from './task.dto.js';

@Controller('tasks')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('task.view')
export class TasksController {
  constructor(private readonly tasks: TaskService, private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('status') status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | undefined, @Query('assigneeUserId') assigneeUserId: string | undefined, @Query('candidateId') candidateId: string | undefined, @Req() request: AuthenticatedRequest) {
    return { items: await this.tasks.list({ status, assigneeUserId, ...(candidateId ? { referenceEntityType: 'CANDIDATE', referenceEntityId: candidateId } : {}) }, this.context(request)) };
  }

  @Get('assignees')
  async assignees(@Req() request: AuthenticatedRequest) {
    const context = this.context(request);
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', ...(context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { id: context.actorId }) },
      select: { id: true, displayName: true, email: true },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
    });
    return { items: users };
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
  constructor(private readonly tasks: TaskService, private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('status') status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | undefined,
    @Query('view') view = 'actionable',
    @Query('sort') sort = 'priority',
    @Query('query') query: string | undefined,
    @Query('candidateId') candidateId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const items = await this.tasks.list({ status, ...(candidateId ? { referenceEntityType: 'CANDIDATE', referenceEntityId: candidateId } : {}) }, this.context(request));
    const serialized = await Promise.all(items.map((item) => toWorkItem(this.prisma, item)));
    const filtered = serialized.filter((item) => matchesWorkView(item, view, request.auth!.userId) && matchesWorkQuery(item, query));
    const ordered = sortWorkItems(filtered, sort);
    const maximum = Math.max(1, Math.min(100, Number(limit ?? 100) || 100));
    return { items: ordered.slice(0, maximum), nextCursor: null };
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async create(@Body() body: CreateWorkItemDto, @Req() request: AuthenticatedRequest) {
    const context = this.context(request);
    const created = await this.tasks.create({
      title: body.title,
      description: body.notes ?? null,
      assigneeUserId: body.assigneeId ?? request.auth!.userId,
      teamId: request.auth!.teamId ?? null,
      waitingOn: body.waitingOn as never ?? null,
      dueAt: new Date(body.dueAt),
      reference: { entityType: body.referenceEntityType ?? 'CANDIDATE', entityId: body.referenceEntityId ?? body.candidateId },
    }, context);
    return toWorkItem(this.prisma, created);
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
    return toWorkItem(this.prisma, await this.tasks.get(id, this.context(request)));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async update(@Param('id') id: string, @Body() body: { status?: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; version: number; reason?: string; assigneeId?: string; dueAt?: string; waitingOn?: 'CANDIDATE' | 'CLIENT_PARTNER' | 'INTERNAL' | 'OTHER' | null }, @Req() request: AuthenticatedRequest) {
    const context = this.context(request);
    const updated = body.assigneeId
      ? await this.tasks.assign(id, { assigneeUserId: body.assigneeId, teamId: request.auth!.teamId ?? null }, body.version, context)
      : body.dueAt !== undefined || body.waitingOn !== undefined
        ? await this.tasks.updateDetails(id, { ...(body.dueAt !== undefined ? { dueAt: new Date(body.dueAt) } : {}), ...(body.waitingOn !== undefined ? { waitingOn: body.waitingOn as never } : {}) }, body.version, context)
      : body.status === 'DONE'
        ? await this.tasks.complete(id, body.version, context)
        : body.status === 'IN_PROGRESS'
          ? await this.tasks.start(id, body.version, context)
          : body.status === 'CANCELLED'
            ? await this.tasks.cancel(id, body.version, body.reason ?? '', context)
            : await this.tasks.get(id, context);
    return toWorkItem(this.prisma, updated);
  }

  private context(request: AuthenticatedRequest): TaskScopeContext {
    const context = getRequestContext();
    const teamScoped = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? ''));
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: teamScoped ? 'TEAM' : 'SELF', correlationId: context?.correlationId ?? 'unknown-correlation' };
  }
}

async function toWorkItem(prisma: PrismaService, item: Awaited<ReturnType<TaskService['get']>>) {
  const reference = item.reference;
  const dueAt = item.dueAt ?? item.updatedAt;
  const priority = item.dueAt && item.dueAt.getTime() < Date.now() ? 'URGENT' : item.dueAt && item.dueAt.getTime() < Date.now() + 2 * 24 * 60 * 60 * 1000 ? 'HIGH' : 'NORMAL';
  type WorkCandidate = { id: string; code: string; name: string };
  type WorkOrder = { id: string; code: string; position: string; client: { id: string; name: string } };
  const [assignee, candidateReference, applicationReference, journeyReference, orderReference] = await Promise.all([
    prisma.user.findUnique({ where: { id: item.assigneeUserId }, select: { displayName: true } }),
    reference.entityType === 'CANDIDATE'
      ? prisma.candidate.findUnique({ where: { id: reference.entityId }, select: { id: true, code: true, name: true } })
      : Promise.resolve(null),
    reference.entityType === 'APPLICATION'
      ? prisma.application.findUnique({ where: { id: reference.entityId }, select: { candidate: { select: { id: true, code: true, name: true } }, jobOrder: { select: { id: true, code: true, position: true, client: { select: { id: true, name: true } } } } } })
      : Promise.resolve(null),
    reference.entityType === 'JOURNEY_MILESTONE'
      ? prisma.supplyJourney.findUnique({ where: { id: reference.entityId }, select: { candidateId: true, applicationId: true } })
      : Promise.resolve(null),
    reference.entityType === 'ORDER'
      ? prisma.jobOrder.findUnique({ where: { id: reference.entityId }, select: { id: true, code: true, position: true, client: { select: { id: true, name: true } } } })
      : Promise.resolve(null),
  ]);
  const [journeyCandidate, journeyApplication] = journeyReference
    ? await Promise.all([
        prisma.candidate.findUnique({ where: { id: journeyReference.candidateId }, select: { id: true, code: true, name: true } }),
        prisma.application.findUnique({ where: { id: journeyReference.applicationId }, select: { jobOrder: { select: { id: true, code: true, position: true, client: { select: { id: true, name: true } } } } } }),
      ])
    : [null, null];
  const candidate: WorkCandidate | null = candidateReference ?? applicationReference?.candidate ?? journeyCandidate;
  const order: WorkOrder | null = orderReference ?? applicationReference?.jobOrder ?? journeyApplication?.jobOrder ?? null;
  return {
    id: item.id, title: item.title, priority, status: item.status, dueAt: dueAt.toISOString(),
    assignee: { id: item.assigneeUserId, name: assignee?.displayName ?? item.assigneeUserId }, sourceType: reference.entityType, sourceLabel: reference.entityId,
    candidate: { id: candidate?.id ?? '', code: candidate?.code ?? '', name: candidate?.name ?? '—' }, order: { id: order?.id ?? '', code: order?.code ?? '', position: order?.position ?? '—' }, client: { id: order?.client.id ?? '', name: order?.client.name ?? '—' },
    updatedAt: item.updatedAt.toISOString(), version: item.version, lastActivity: item.updatedAt.toISOString(), notes: item.description ?? '', waitingOn: item.waitingOn ?? 'NONE',
  };
}

type SerializedWorkItem = Awaited<ReturnType<typeof toWorkItem>>;

function matchesWorkView(item: SerializedWorkItem, view: string, actorId: string): boolean {
  const now = Date.now();
  const dueAt = new Date(item.dueAt).getTime();
  const terminal = item.status === 'DONE' || item.status === 'CANCELLED';
  if (view === 'overdue') return !terminal && dueAt < now;
  if (view === 'today') return !terminal && dueAt >= now && dueAt <= now + 24 * 60 * 60 * 1000;
  if (view === 'seven-days') return !terminal && dueAt >= now && dueAt <= now + 7 * 24 * 60 * 60 * 1000;
  if (view === 'waiting-reply') return !terminal && (item.waitingOn === 'CANDIDATE' || item.waitingOn === 'CLIENT_PARTNER');
  if (view === 'assigned-to-me' || view === 'following') return item.assignee.id === actorId;
  if (view === 'email') return item.sourceType.toLowerCase().includes('email');
  if (view === 'journey-risk') return item.sourceType.toLowerCase().includes('journey');
  if (view === 'actionable') return !terminal;
  return true;
}

function matchesWorkQuery(item: SerializedWorkItem, query: string | undefined): boolean {
  const term = query?.trim().toLocaleLowerCase();
  if (!term) return true;
  return [
    item.title,
    item.sourceLabel,
    item.candidate.code,
    item.candidate.name,
    item.order.code,
    item.order.position,
    item.client.name,
    item.assignee.name,
  ].some((value) => value.toLocaleLowerCase().includes(term));
}

function sortWorkItems(items: SerializedWorkItem[], sort: string): SerializedWorkItem[] {
  const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2 };
  return [...items].sort((left, right) => {
    if (sort === 'updatedAt' || sort === '-updatedAt') return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (sort === 'dueAt' || sort === '-dueAt') return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    return priorityRank[left.priority] - priorityRank[right.priority] || new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
  });
}
