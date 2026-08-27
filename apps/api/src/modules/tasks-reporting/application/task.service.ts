import { assertTaskTransition, TASK_WAITING_ON, TaskDomainError, validateCreateTask, type CreateTaskInput, type TaskEntity, type TaskStatus, type TaskWaitingOn } from '../domain/task.rules.js';

export type TaskScope = 'SELF' | 'TEAM';
export interface TaskScopeContext { actorId: string; teamId?: string; scope: TaskScope; correlationId: string }
export interface TaskListFilter { status?: TaskStatus; assigneeUserId?: string; waitingOn?: TaskWaitingOn; referenceEntityType?: string; referenceEntityId?: string }

export interface TaskRepository {
  withTransaction<T>(work: (repository: TaskRepository, transaction: unknown) => Promise<T>): Promise<T>;
  create(input: CreateTaskInput): Promise<TaskEntity>;
  findScoped(id: string, context: TaskScopeContext): Promise<TaskEntity | null>;
  findByDedupe(dedupeKey: string, context: TaskScopeContext): Promise<TaskEntity | null>;
  list(filter: TaskListFilter, context: TaskScopeContext): Promise<TaskEntity[]>;
  updateStatus(id: string, expectedVersion: number, status: TaskStatus, context: TaskScopeContext): Promise<TaskEntity | null>;
  updateDetails(id: string, expectedVersion: number, input: { dueAt?: Date | null; waitingOn?: TaskWaitingOn | null; description?: string | null }, context: TaskScopeContext): Promise<TaskEntity | null>;
  assign(id: string, expectedVersion: number, assigneeUserId: string, teamId: string | null, context: TaskScopeContext): Promise<TaskEntity | null>;
  userInScope(userId: string, teamId: string | null, context: TaskScopeContext): Promise<boolean>;
}

export interface TaskMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string; metadata?: Record<string, unknown> }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string; payload: Record<string, unknown> }): Promise<void>;
  notification?(transaction: unknown, input: { userId: string; kind: 'TASK_ASSIGNED'; severity: 'INFO'; params: Record<string, unknown>; href: string; dedupeKey: string }): Promise<void>;
}

export class TaskService {
  constructor(private readonly repository: TaskRepository, private readonly effects?: TaskMutationEffects) {}

  async create(input: CreateTaskInput, context: TaskScopeContext): Promise<TaskEntity> {
    validateCreateTask(input);
    if (!(await this.repository.userInScope(input.assigneeUserId, input.teamId ?? null, context))) throw new TaskDomainError('ASSIGNEE_OUT_OF_SCOPE', 403);
    return this.repository.withTransaction(async (repository, transaction) => {
      if (input.dedupeKey) {
        const existing = await repository.findByDedupe(input.dedupeKey, context);
        if (existing) return existing;
      }
      const created = await repository.create(input);
      await this.recordEffects(transaction, context, created, 'TASK_CREATED', 'task.created', { dedupeKey: input.dedupeKey ?? null });
      return created;
    });
  }

  async list(filter: TaskListFilter, context: TaskScopeContext): Promise<TaskEntity[]> {
    return this.repository.list(filter, context);
  }

  async get(id: string, context: TaskScopeContext): Promise<TaskEntity> {
    const task = await this.repository.findScoped(id, context);
    if (!task) throw new TaskDomainError('TASK_NOT_FOUND', 404);
    return task;
  }

  async start(id: string, expectedVersion: number, context: TaskScopeContext): Promise<TaskEntity> {
    return this.transition(id, expectedVersion, 'IN_PROGRESS', context, 'TASK_STARTED', 'task.started');
  }

  async complete(id: string, expectedVersion: number, context: TaskScopeContext): Promise<TaskEntity> {
    return this.transition(id, expectedVersion, 'DONE', context, 'TASK_COMPLETED', 'task.completed');
  }

  async cancel(id: string, expectedVersion: number, reason: string, context: TaskScopeContext): Promise<TaskEntity> {
    if (!reason.trim()) throw new TaskDomainError('TASK_CANCEL_REASON_REQUIRED');
    return this.transition(id, expectedVersion, 'CANCELLED', context, 'TASK_CANCELLED', 'task.cancelled', { reason: reason.trim() });
  }

  async assign(id: string, input: { assigneeUserId: string; teamId?: string | null }, expectedVersion: number, context: TaskScopeContext): Promise<TaskEntity> {
    if (!(await this.repository.userInScope(input.assigneeUserId, input.teamId ?? null, context))) throw new TaskDomainError('ASSIGNEE_OUT_OF_SCOPE', 403);
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findScoped(id, context);
      if (!current) throw new TaskDomainError('TASK_NOT_FOUND', 404);
      if (current.version !== expectedVersion) throw new TaskDomainError('VERSION_CONFLICT', 409);
      if (current.status === 'DONE' || current.status === 'CANCELLED') throw new TaskDomainError('TASK_TERMINAL', 409);
      const updated = await repository.assign(id, expectedVersion, input.assigneeUserId, input.teamId ?? null, context);
      if (!updated) throw new TaskDomainError('VERSION_CONFLICT', 409);
      await this.recordEffects(transaction, context, updated, 'TASK_ASSIGNED', 'task.assigned', { assigneeUserId: input.assigneeUserId, teamId: input.teamId ?? null });
      return updated;
    });
  }

  async updateDetails(id: string, input: { dueAt?: Date | null; waitingOn?: TaskWaitingOn | null; description?: string | null }, expectedVersion: number, context: TaskScopeContext): Promise<TaskEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findScoped(id, context);
      if (!current) throw new TaskDomainError('TASK_NOT_FOUND', 404);
      if (current.version !== expectedVersion) throw new TaskDomainError('VERSION_CONFLICT', 409);
      if (current.status === 'DONE' || current.status === 'CANCELLED') throw new TaskDomainError('TASK_TERMINAL', 409);
      if (input.waitingOn !== undefined && input.waitingOn !== null && !TASK_WAITING_ON.includes(input.waitingOn)) throw new TaskDomainError('INVALID_TASK_WAITING_ON');
      if (input.dueAt === null && !current.noDueDateReason) throw new TaskDomainError('MANUAL_TASK_DUE_DATE_REQUIRED');
      const updated = await repository.updateDetails(id, expectedVersion, input, context);
      if (!updated) throw new TaskDomainError('VERSION_CONFLICT', 409);
      await this.recordEffects(transaction, context, updated, 'TASK_DETAILS_UPDATED', 'task.updated', { dueAt: updated.dueAt?.toISOString() ?? null, waitingOn: updated.waitingOn ?? null });
      return updated;
    });
  }

  private async transition(id: string, expectedVersion: number, target: TaskStatus, context: TaskScopeContext, action: string, eventType: string, metadata: Record<string, unknown> = {}): Promise<TaskEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findScoped(id, context);
      if (!current) throw new TaskDomainError('TASK_NOT_FOUND', 404);
      if (current.version !== expectedVersion) throw new TaskDomainError('VERSION_CONFLICT', 409);
      assertTaskTransition(current.status, target);
      const updated = await repository.updateStatus(id, expectedVersion, target, context);
      if (!updated) throw new TaskDomainError('VERSION_CONFLICT', 409);
      await this.recordEffects(transaction, context, updated, action, eventType, metadata);
      return updated;
    });
  }

  private async recordEffects(transaction: unknown, context: TaskScopeContext, entity: TaskEntity, action: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId, metadata });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId, payload: { taskId: entity.id, status: entity.status, reference: entity.reference, ...metadata } });
    if (this.effects.notification && (action === 'TASK_CREATED' || action === 'TASK_ASSIGNED')) {
      await this.effects.notification(transaction, {
        userId: entity.assigneeUserId,
        kind: 'TASK_ASSIGNED',
        severity: 'INFO',
        params: { title: entity.title },
        href: `/work?selectedId=${encodeURIComponent(entity.id)}`,
        dedupeKey: `task-notification:${entity.id}:${action}:${entity.version}`,
      });
    }
  }
}
