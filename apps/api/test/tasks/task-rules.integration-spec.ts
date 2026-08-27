import { describe, expect, it } from 'vitest';
import {
  assertTaskTransition,
  deterministicTaskDedupeKey,
  evaluateTaskRule,
  TaskDomainError,
  validateCreateTask,
  validateTaskRuleVersion,
  type TaskRuleVersionEntity,
} from '../../src/modules/tasks-reporting/domain/task.rules.js';
import { TaskService, type TaskRepository, type TaskScopeContext } from '../../src/modules/tasks-reporting/application/task.service.js';
import type { CreateTaskInput, TaskEntity } from '../../src/modules/tasks-reporting/domain/task.rules.js';
import type { TaskListFilter } from '../../src/modules/tasks-reporting/application/task.service.js';
import { TaskRuleConsumer } from '../../src/modules/tasks-reporting/application/task-rule.consumer.js';

describe('task rules', () => {
  it('requires assignee/reference and deterministic due/dedupe for rule tasks', () => {
    expect(deterministicTaskDedupeKey('journey.milestone.blocked', { entityType: 'JourneyMilestone', entityId: 'm-1' }, 'follow-up')).toBe('journey.milestone.blocked:JourneyMilestone:m-1:follow-up');
    expect(() => validateCreateTask({ title: 'Review', assigneeUserId: 'u-1', reference: { entityType: 'Journey', entityId: 'j-1' }, ruleCode: 'rule', sourceEventId: 'event' })).toThrow(/RULE_TASK/);
    expect(() => validateCreateTask({ title: 'Manual', assigneeUserId: 'u-1', reference: { entityType: 'Journey', entityId: 'j-1' } })).toThrow(/MANUAL_TASK/);
  });

  it('keeps DONE/CANCELLED terminal and validates versioned rule actions', () => {
    expect(assertTaskTransition('NEW', 'IN_PROGRESS')).toBeUndefined();
    expect(() => assertTaskTransition('DONE', 'IN_PROGRESS')).toThrow(TaskDomainError);
    expect(() => validateTaskRuleVersion({ code: 'journey.blocked', version: 1, status: 'ACTIVE', eventType: 'journey.milestone.blocked', action: 'CREATE', titleTemplate: 'Theo dõi mốc bị chặn', dueAfterHours: 24, referenceEntityType: 'JourneyMilestone', businessSlot: 'follow-up', conditions: {} })).not.toThrow();
    expect(() => validateTaskRuleVersion({ code: 'bad', version: 1, status: 'ACTIVE', eventType: 'journey.blocked', action: 'CREATE', titleTemplate: 'bad', dueAfterHours: 1, referenceEntityType: 'JourneyMilestone', businessSlot: 'slot', conditions: { script: 'eval()' } })).toThrow(/CONDITIONS/);
  });

  it('replays an active event to one deterministic action without changing its source aggregate', () => {
    const rule: TaskRuleVersionEntity = { id: 'rule-1', code: 'journey.blocked', version: 1, status: 'ACTIVE', eventType: 'journey.milestone.blocked', action: 'CREATE', titleTemplate: 'Theo dõi mốc bị chặn', dueAfterHours: 24, referenceEntityType: 'JourneyMilestone', businessSlot: 'follow-up', conditions: {}, createdAt: new Date(), updatedAt: new Date() };
    const event = { id: 'event-1', eventType: rule.eventType, occurredAt: new Date('2026-08-24T00:00:00Z'), aggregateType: 'JourneyMilestone', aggregateId: 'm-1', payload: { assigneeUserId: 'u-1', teamId: 'team-1' } };
    const first = evaluateTaskRule(rule, event);
    const replay = evaluateTaskRule(rule, event);
    expect(first).toEqual(replay);
    expect(first?.dedupeKey).toBe('journey.blocked:JourneyMilestone:m-1:follow-up');
    expect(first?.task.reference).toEqual({ entityType: 'JourneyMilestone', entityId: 'm-1' });
  });
});

class InMemoryTaskRepository implements TaskRepository {
  private sequence = 0;
  private readonly tasks = new Map<string, TaskEntity>();
  async withTransaction<T>(work: (repository: TaskRepository, transaction: unknown) => Promise<T>): Promise<T> { return work(this, { kind: 'test-transaction' }); }
  async create(input: CreateTaskInput) {
    const now = new Date();
    const task: TaskEntity = { id: `task-${++this.sequence}`, title: input.title, description: input.description ?? null, status: 'NEW', assigneeUserId: input.assigneeUserId, teamId: input.teamId ?? null, waitingOn: input.waitingOn ?? null, dueAt: input.dueAt ?? null, noDueDateReason: input.noDueDateReason ?? null, ruleCode: input.ruleCode ?? null, sourceEventId: input.sourceEventId ?? null, dedupeKey: input.dedupeKey ?? null, reference: input.reference, version: 1, createdAt: now, updatedAt: now };
    this.tasks.set(task.id, task);
    return task;
  }
  private inScope(task: TaskEntity, context: TaskScopeContext) { return context.scope === 'TEAM' ? task.teamId === context.teamId : task.assigneeUserId === context.actorId; }
  async findScoped(id: string, context: TaskScopeContext) { const task = this.tasks.get(id); return task && this.inScope(task, context) ? task : null; }
  async findByDedupe(dedupeKey: string, context: TaskScopeContext) { return [...this.tasks.values()].find((task) => task.dedupeKey === dedupeKey && this.inScope(task, context)) ?? null; }
  async list(filter: TaskListFilter, context: TaskScopeContext) { return [...this.tasks.values()].filter((task) => this.inScope(task, context) && (!filter.status || task.status === filter.status)); }
  async updateStatus(id: string, expectedVersion: number, status: TaskEntity['status'], context: TaskScopeContext) { const task = await this.findScoped(id, context); if (!task || task.version !== expectedVersion) return null; const updated = { ...task, status, version: task.version + 1, updatedAt: new Date() }; this.tasks.set(id, updated); return updated; }
  async updateDetails(id: string, expectedVersion: number, input: { dueAt?: Date | null; waitingOn?: TaskEntity['waitingOn']; description?: string | null }, context: TaskScopeContext) { const task = await this.findScoped(id, context); if (!task || task.version !== expectedVersion) return null; const updated = { ...task, ...input, version: task.version + 1, updatedAt: new Date() }; this.tasks.set(id, updated); return updated; }
  async assign(id: string, expectedVersion: number, assigneeUserId: string, teamId: string | null, context: TaskScopeContext) { const task = await this.findScoped(id, context); if (!task || task.version !== expectedVersion) return null; const updated = { ...task, assigneeUserId, teamId, version: task.version + 1, updatedAt: new Date() }; this.tasks.set(id, updated); return updated; }
  async userInScope(userId: string, teamId: string | null, context: TaskScopeContext) { return context.scope === 'TEAM' ? userId.startsWith('u-') && teamId === context.teamId : userId === context.actorId; }
}

describe('task service', () => {
  it('enforces scope/CAS and does not mutate the referenced aggregate on completion', async () => {
    const repo = new InMemoryTaskRepository();
    const events: string[] = [];
    const service = new TaskService(repo, {
      audit: async (transaction, input) => { expect(transaction).toMatchObject({ kind: 'test-transaction' }); events.push(input.action); },
      outbox: async (transaction, input) => { expect(transaction).toMatchObject({ kind: 'test-transaction' }); events.push(input.eventType); },
    });
    const context: TaskScopeContext = { actorId: 'u-1', teamId: 'team-1', scope: 'TEAM', correlationId: 'corr-1' };
    const task = await service.create({ title: 'Review hồ sơ', assigneeUserId: 'u-2', teamId: 'team-1', dueAt: new Date('2026-08-25T00:00:00Z'), ruleCode: 'journey.blocked', sourceEventId: 'event-1', dedupeKey: 'journey.blocked:Milestone:m-1:follow-up', reference: { entityType: 'JourneyMilestone', entityId: 'm-1' } }, context);
    const replay = await service.create({ title: 'Review hồ sơ', assigneeUserId: 'u-2', teamId: 'team-1', dueAt: new Date('2026-08-25T00:00:00Z'), ruleCode: 'journey.blocked', sourceEventId: 'event-1', dedupeKey: task.dedupeKey, reference: { entityType: 'JourneyMilestone', entityId: 'm-1' } }, context);
    expect(replay.id).toBe(task.id);
    const started = await service.start(task.id, task.version, context);
    await expect(service.complete(task.id, task.version, context)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    const completed = await service.complete(task.id, started.version, context);
    expect(completed.status).toBe('DONE');
    expect(events).toEqual(['TASK_CREATED', 'task.created', 'TASK_STARTED', 'task.started', 'TASK_COMPLETED', 'task.completed']);
  });

  it('consumes only CREATE rules and remains replay-safe at the task dedupe boundary', async () => {
    const repo = new InMemoryTaskRepository();
    const service = new TaskService(repo);
    const consumer = new TaskRuleConsumer(service);
    const rule: TaskRuleVersionEntity = { id: 'rule-1', code: 'journey.blocked', version: 1, status: 'ACTIVE', eventType: 'journey.milestone.blocked', action: 'CREATE', titleTemplate: 'Theo dõi mốc bị chặn', dueAfterHours: 24, referenceEntityType: 'JourneyMilestone', businessSlot: 'follow-up', conditions: {}, createdAt: new Date(), updatedAt: new Date() };
    const event = { id: 'event-1', eventType: rule.eventType, occurredAt: new Date('2026-08-24T00:00:00Z'), aggregateType: 'JourneyMilestone', aggregateId: 'm-1', payload: { assigneeUserId: 'u-1', teamId: 'team-1' } };
    const context: TaskScopeContext = { actorId: 'u-1', teamId: 'team-1', scope: 'TEAM', correlationId: 'corr-1' };
    const first = await consumer.consume(rule, event, context);
    const replay = await consumer.consume(rule, event, context);
    expect(first?.id).toBe(replay?.id);
  });
});
