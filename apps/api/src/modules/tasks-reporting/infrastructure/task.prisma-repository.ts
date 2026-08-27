import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { TaskRepository, TaskListFilter, TaskScopeContext } from '../application/task.service.js';
import type { CreateTaskInput, TaskEntity, TaskStatus, TaskWaitingOn } from '../domain/task.rules.js';

type TaskRow = {
  id: string; title: string; description: string | null; status: string; assigneeUserId: string; teamId: string | null;
  waitingOn: string | null; dueAt: Date | null; noDueDateReason: string | null; ruleCode: string | null; sourceEventId: string | null;
  dedupeKey: string | null; referenceEntityType: string; referenceEntityId: string; version: number; createdAt: Date; updatedAt: Date;
};

function mapRow(row: TaskRow): TaskEntity {
  return {
    id: row.id, title: row.title, description: row.description, status: row.status as TaskStatus, assigneeUserId: row.assigneeUserId,
    teamId: row.teamId, waitingOn: row.waitingOn as TaskWaitingOn | null, dueAt: row.dueAt, noDueDateReason: row.noDueDateReason,
    ruleCode: row.ruleCode, sourceEventId: row.sourceEventId, dedupeKey: row.dedupeKey,
    reference: { entityType: row.referenceEntityType, entityId: row.referenceEntityId }, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TaskPrismaRepository implements TaskRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: TaskRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new TaskPrismaRepository(transaction), transaction));
    return work(this, this.prisma);
  }

  async create(input: CreateTaskInput): Promise<TaskEntity> {
    const row = await this.prisma.task.create({ data: {
      title: input.title.trim(), description: input.description?.trim() ?? null, status: 'NEW', assigneeUserId: input.assigneeUserId,
      teamId: input.teamId ?? null, waitingOn: input.waitingOn ?? null, dueAt: input.dueAt ?? null, noDueDateReason: input.noDueDateReason?.trim() ?? null,
      ruleCode: input.ruleCode ?? null, sourceEventId: input.sourceEventId ?? null, dedupeKey: input.dedupeKey ?? null,
      referenceEntityType: input.reference.entityType, referenceEntityId: input.reference.entityId,
    } });
    return mapRow(row);
  }

  private scopedWhere(context: TaskScopeContext): Prisma.TaskWhereInput {
    return context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { assigneeUserId: context.actorId };
  }

  async findScoped(id: string, context: TaskScopeContext): Promise<TaskEntity | null> {
    const row = await this.prisma.task.findFirst({ where: { id, ...this.scopedWhere(context) } });
    return row ? mapRow(row) : null;
  }

  async findByDedupe(dedupeKey: string, context: TaskScopeContext): Promise<TaskEntity | null> {
    const row = await this.prisma.task.findFirst({ where: { dedupeKey, ...this.scopedWhere(context) } });
    return row ? mapRow(row) : null;
  }

  async list(filter: TaskListFilter, context: TaskScopeContext): Promise<TaskEntity[]> {
    const where: Prisma.TaskWhereInput = { ...this.scopedWhere(context), ...(filter.status ? { status: filter.status } : {}), ...(filter.assigneeUserId ? { assigneeUserId: filter.assigneeUserId } : {}), ...(filter.waitingOn ? { waitingOn: filter.waitingOn } : {}), ...(filter.referenceEntityType ? { referenceEntityType: filter.referenceEntityType } : {}), ...(filter.referenceEntityId ? { referenceEntityId: filter.referenceEntityId } : {}) };
    const rows = await this.prisma.task.findMany({ where, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 101 });
    return rows.map(mapRow);
  }

  async updateStatus(id: string, expectedVersion: number, status: TaskStatus, context: TaskScopeContext): Promise<TaskEntity | null> {
    const updated = await this.prisma.task.updateMany({ where: { id, version: expectedVersion, ...this.scopedWhere(context) }, data: { status, version: { increment: 1 } } });
    if (updated.count !== 1) return null;
    const row = await this.prisma.task.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async updateDetails(id: string, expectedVersion: number, input: { dueAt?: Date | null; waitingOn?: TaskWaitingOn | null; description?: string | null }, context: TaskScopeContext): Promise<TaskEntity | null> {
    const updated = await this.prisma.task.updateMany({
      where: { id, version: expectedVersion, ...this.scopedWhere(context) },
      data: {
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.waitingOn !== undefined ? { waitingOn: input.waitingOn } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) return null;
    const row = await this.prisma.task.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async assign(id: string, expectedVersion: number, assigneeUserId: string, teamId: string | null, context: TaskScopeContext): Promise<TaskEntity | null> {
    const updated = await this.prisma.task.updateMany({ where: { id, version: expectedVersion, ...this.scopedWhere(context) }, data: { assigneeUserId, teamId, version: { increment: 1 } } });
    if (updated.count !== 1) return null;
    const row = await this.prisma.task.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async userInScope(userId: string, teamId: string | null, context: TaskScopeContext): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true, teamId: true } });
    if (!user || user.status !== 'ACTIVE') return false;
    if (context.scope === 'TEAM') return Boolean(context.teamId && user.teamId === context.teamId && (!teamId || teamId === context.teamId));
    return user.id === context.actorId;
  }
}
