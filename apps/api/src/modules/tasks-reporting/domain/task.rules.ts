export const TASK_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_WAITING_ON = ['CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'OTHER'] as const;
export type TaskWaitingOn = (typeof TASK_WAITING_ON)[number];
export const TASK_RULE_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type TaskRuleStatus = (typeof TASK_RULE_STATUSES)[number];
export const TASK_RULE_ACTIONS = ['CREATE', 'UPDATE_OPEN', 'CANCEL_OPEN', 'REQUEST_NOTIFICATION'] as const;
export type TaskRuleAction = (typeof TASK_RULE_ACTIONS)[number];

export interface TaskReference { entityType: string; entityId: string }

export interface TaskEntity {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeUserId: string;
  teamId: string | null;
  waitingOn: TaskWaitingOn | null;
  dueAt: Date | null;
  noDueDateReason: string | null;
  ruleCode: string | null;
  sourceEventId: string | null;
  dedupeKey: string | null;
  reference: TaskReference;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRuleVersionEntity {
  id: string;
  code: string;
  version: number;
  status: TaskRuleStatus;
  eventType: string;
  action: TaskRuleAction;
  titleTemplate: string;
  dueAfterHours: number | null;
  referenceEntityType: string;
  businessSlot: string;
  conditions: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assigneeUserId: string;
  teamId?: string | null;
  waitingOn?: TaskWaitingOn | null;
  dueAt?: Date | null;
  noDueDateReason?: string | null;
  ruleCode?: string | null;
  sourceEventId?: string | null;
  dedupeKey?: string | null;
  reference: TaskReference;
}

export class TaskDomainError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, statusCode = 422) {
    super(code);
    this.name = 'TaskDomainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requiredText(value: unknown, code: string, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new TaskDomainError(code);
}

export function deterministicTaskDedupeKey(ruleCode: string, reference: TaskReference, businessSlot: string): string {
  requiredText(ruleCode, 'INVALID_TASK_RULE_CODE', 120);
  requiredText(reference.entityType, 'INVALID_TASK_REFERENCE', 80);
  requiredText(reference.entityId, 'INVALID_TASK_REFERENCE', 120);
  requiredText(businessSlot, 'INVALID_TASK_BUSINESS_SLOT', 120);
  return `${ruleCode.trim()}:${reference.entityType.trim()}:${reference.entityId.trim()}:${businessSlot.trim()}`;
}

export function validateCreateTask(input: CreateTaskInput): void {
  requiredText(input.title, 'INVALID_TASK_TITLE', 240);
  requiredText(input.assigneeUserId, 'INVALID_TASK_ASSIGNEE', 120);
  requiredText(input.reference?.entityType, 'INVALID_TASK_REFERENCE', 80);
  requiredText(input.reference?.entityId, 'INVALID_TASK_REFERENCE', 120);
  if (input.waitingOn !== null && input.waitingOn !== undefined && !TASK_WAITING_ON.includes(input.waitingOn)) throw new TaskDomainError('INVALID_TASK_WAITING_ON');
  const ruleCreated = Boolean(input.ruleCode || input.sourceEventId || input.dedupeKey);
  if (ruleCreated && (!input.ruleCode || !input.sourceEventId || !input.dedupeKey || !input.dueAt)) throw new TaskDomainError('RULE_TASK_REQUIRES_DEDUPE_DUE');
  if (!ruleCreated && !input.dueAt && !input.noDueDateReason?.trim()) throw new TaskDomainError('MANUAL_TASK_DUE_DATE_REQUIRED');
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  const allowed: Record<TaskStatus, readonly TaskStatus[]> = {
    NEW: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
    IN_PROGRESS: ['DONE', 'CANCELLED'],
    DONE: [],
    CANCELLED: [],
  };
  if (!allowed[from]?.includes(to)) throw new TaskDomainError('TASK_TERMINAL', 409);
}

export function validateTaskRuleVersion(rule: Omit<TaskRuleVersionEntity, 'id' | 'createdAt' | 'updatedAt'>): void {
  requiredText(rule.code, 'INVALID_TASK_RULE_CODE', 120);
  requiredText(rule.eventType, 'INVALID_TASK_RULE_EVENT', 120);
  requiredText(rule.titleTemplate, 'INVALID_TASK_TITLE_TEMPLATE', 240);
  requiredText(rule.referenceEntityType, 'INVALID_TASK_REFERENCE', 80);
  requiredText(rule.businessSlot, 'INVALID_TASK_BUSINESS_SLOT', 120);
  if (!Number.isInteger(rule.version) || rule.version < 1) throw new TaskDomainError('INVALID_TASK_RULE_VERSION');
  if (!TASK_RULE_STATUSES.includes(rule.status) || !TASK_RULE_ACTIONS.includes(rule.action)) throw new TaskDomainError('INVALID_TASK_RULE_STATUS');
  if (rule.dueAfterHours !== null && (!Number.isInteger(rule.dueAfterHours) || rule.dueAfterHours < 0 || rule.dueAfterHours > 24 * 365)) throw new TaskDomainError('INVALID_TASK_RULE_DUE');
  if (!rule.conditions || typeof rule.conditions !== 'object' || Array.isArray(rule.conditions)) throw new TaskDomainError('INVALID_TASK_RULE_CONDITIONS');
  const encoded = JSON.stringify(rule.conditions);
  if (/\$(?:ref|function)|script|eval|https?:\/\//i.test(encoded)) throw new TaskDomainError('INVALID_TASK_RULE_CONDITIONS');
}

export interface TaskRuleEvent {
  id: string;
  eventType: string;
  occurredAt: Date;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface TaskRuleActionResult {
  action: TaskRuleAction;
  dedupeKey: string;
  task: CreateTaskInput;
}

export function evaluateTaskRule(rule: TaskRuleVersionEntity, event: TaskRuleEvent): TaskRuleActionResult | null {
  if (rule.status !== 'ACTIVE' || rule.eventType !== event.eventType) return null;
  const expectedAggregateType = rule.conditions.aggregateType;
  if (typeof expectedAggregateType === 'string' && expectedAggregateType !== event.aggregateType) return null;
  const dedupeKey = deterministicTaskDedupeKey(rule.code, { entityType: rule.referenceEntityType, entityId: event.aggregateId }, rule.businessSlot);
  const dueAt = rule.dueAfterHours === null ? null : new Date(event.occurredAt.getTime() + rule.dueAfterHours * 60 * 60 * 1000);
  const teamId = typeof event.payload.teamId === 'string' ? event.payload.teamId : null;
  if (!dueAt) return { action: rule.action, dedupeKey, task: { title: rule.titleTemplate, assigneeUserId: String(event.payload.assigneeUserId ?? ''), teamId, dueAt: null, noDueDateReason: 'RULE_NO_DUE_DATE', ruleCode: rule.code, sourceEventId: event.id, dedupeKey, reference: { entityType: rule.referenceEntityType, entityId: event.aggregateId } } };
  return { action: rule.action, dedupeKey, task: { title: rule.titleTemplate, assigneeUserId: String(event.payload.assigneeUserId ?? ''), teamId, dueAt, ruleCode: rule.code, sourceEventId: event.id, dedupeKey, reference: { entityType: rule.referenceEntityType, entityId: event.aggregateId } } };
}
