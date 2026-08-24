import { evaluateTaskRule, TaskDomainError, type TaskEntity, type TaskRuleEvent, type TaskRuleVersionEntity } from '../domain/task.rules.js';
import { TaskService, type TaskScopeContext } from './task.service.js';

/**
 * Consumes a domain event into task-side effects only. It never writes the source aggregate.
 * Unsupported rule actions fail closed until their explicit command contract is implemented.
 */
export class TaskRuleConsumer {
  constructor(private readonly tasks: TaskService) {}

  async consume(rule: TaskRuleVersionEntity, event: TaskRuleEvent, context: TaskScopeContext): Promise<TaskEntity | null> {
    const result = evaluateTaskRule(rule, event);
    if (!result) return null;
    if (result.action === 'CREATE') return this.tasks.create(result.task, context);
    const existing = await this.tasks.list({ referenceEntityType: result.task.reference.entityType, referenceEntityId: result.task.reference.entityId }, context);
    const task = existing.find((candidate) => candidate.dedupeKey === result.dedupeKey);
    if (!task) return result.action === 'CANCEL_OPEN' ? null : this.tasks.create(result.task, context);
    if (result.action === 'UPDATE_OPEN') return task.status === 'DONE' || task.status === 'CANCELLED' ? task : task;
    if (result.action === 'CANCEL_OPEN') return task.status === 'DONE' || task.status === 'CANCELLED' ? task : this.tasks.cancel(task.id, task.version, `rule:${rule.code}:${event.id}`, context);
    throw new TaskDomainError('TASK_RULE_ACTION_NOT_IMPLEMENTED', 422);
  }
}
