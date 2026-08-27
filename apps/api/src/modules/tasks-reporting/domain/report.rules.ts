export const CANONICAL_REPORT_CODES = [
  'candidate_inventory',
  'order_pipeline',
  'interview_outcomes',
  'application_conversion',
  'journey_progress',
  'time_to_milestone',
  'email_operations',
  'task_workload',
] as const;
export type CanonicalReportCode = (typeof CANONICAL_REPORT_CODES)[number];

export interface ReportDefinition {
  code: CanonicalReportCode;
  definitionVersion: string;
  timeBasis: string;
  denominator: string;
  dimensions: readonly string[];
  filters: readonly string[];
  maxRangeDays: number;
  maxCardinality: number;
}

export const REPORT_DEFINITIONS: Readonly<Record<CanonicalReportCode, ReportDefinition>> = {
  candidate_inventory: { code: 'candidate_inventory', definitionVersion: '1.0.0', timeBasis: 'candidate snapshot asOf', denominator: 'all scoped active Candidate', dimensions: ['readinessStatus', 'sector', 'occupation', 'visaRoute', 'residenceContext'], filters: ['teamId', 'ownerId', 'occupationId', 'sectorId', 'visaRouteId'], maxRangeDays: 366, maxCardinality: 1000 },
  order_pipeline: { code: 'order_pipeline', definitionVersion: '1.0.0', timeBasis: 'application state at asOf', denominator: 'scoped active attempts', dimensions: ['orderId', 'status', 'ownerId'], filters: ['teamId', 'ownerId', 'clientId', 'orderId'], maxRangeDays: 366, maxCardinality: 1000 },
  interview_outcomes: { code: 'interview_outcomes', definitionVersion: '1.0.0', timeBasis: 'interview completedAt', denominator: 'completed interviews in range', dimensions: ['result', 'round', 'orderId'], filters: ['teamId', 'ownerId', 'orderId'], maxRangeDays: 366, maxCardinality: 1000 },
  application_conversion: { code: 'application_conversion', definitionVersion: '1.0.0', timeBasis: 'application.createdAt cohort', denominator: 'applications with observation window', dimensions: ['status', 'orderId', 'source'], filters: ['teamId', 'ownerId', 'orderId', 'source'], maxRangeDays: 730, maxCardinality: 1000 },
  journey_progress: { code: 'journey_progress', definitionVersion: '1.0.0', timeBasis: 'journey snapshot and dueAt', denominator: 'scoped effective journeys/milestones', dimensions: ['journeyStatus', 'milestoneStatus', 'blockerParty', 'overdue'], filters: ['teamId', 'ownerId', 'templateId', 'milestoneCode'], maxRangeDays: 366, maxCardinality: 1000 },
  time_to_milestone: { code: 'time_to_milestone', definitionVersion: '1.0.0', timeBasis: 'milestone completedAt', denominator: 'completed milestones excluding waived/not applicable', dimensions: ['milestoneCode', 'templateId'], filters: ['teamId', 'ownerId', 'templateId', 'milestoneCode'], maxRangeDays: 730, maxCardinality: 500 },
  email_operations: { code: 'email_operations', definitionVersion: '1.0.0', timeBasis: 'provider event time', denominator: 'messages with provider status', dimensions: ['status', 'direction', 'mailboxId'], filters: ['teamId', 'mailboxId', 'journeyId'], maxRangeDays: 366, maxCardinality: 1000 },
  task_workload: { code: 'task_workload', definitionVersion: '1.0.0', timeBasis: 'task snapshot/doneAt', denominator: 'scoped tasks', dimensions: ['assigneeId', 'teamId', 'status', 'ruleCode'], filters: ['teamId', 'assigneeId', 'status', 'ruleCode'], maxRangeDays: 366, maxCardinality: 1000 },
};

export class ReportQueryError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, statusCode = 422) {
    super(code);
    this.name = 'ReportQueryError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ReportQuery {
  code: string;
  from: Date;
  to: Date;
  timezone: string;
  groupBy?: string[];
  filters?: Record<string, string | string[]>;
}

export function validateReportQuery(query: ReportQuery): ReportDefinition {
  const definition = REPORT_DEFINITIONS[query.code as CanonicalReportCode];
  if (!definition) throw new ReportQueryError('REPORT_NOT_FOUND', 404);
  if (!(query.from instanceof Date) || Number.isNaN(query.from.getTime()) || !(query.to instanceof Date) || Number.isNaN(query.to.getTime()) || query.from >= query.to) throw new ReportQueryError('REPORT_DATE_RANGE_INVALID');
  const days = (query.to.getTime() - query.from.getTime()) / 86_400_000;
  if (days > definition.maxRangeDays) throw new ReportQueryError('REPORT_QUERY_TOO_EXPENSIVE', 422);
  try { new Intl.DateTimeFormat('en-US', { timeZone: query.timezone }).format(query.from); } catch { throw new ReportQueryError('REPORT_TIMEZONE_INVALID'); }
  const groupBy = query.groupBy ?? [];
  if (groupBy.some((dimension) => !definition.dimensions.includes(dimension))) throw new ReportQueryError('REPORT_FILTER_UNSUPPORTED');
  const filters = query.filters ?? {};
  for (const [key, value] of Object.entries(filters)) {
    if (!definition.filters.includes(key) || (Array.isArray(value) && value.length > definition.maxCardinality)) throw new ReportQueryError('REPORT_FILTER_UNSUPPORTED');
  }
  if (groupBy.length > 3 || Object.keys(filters).length > 10) throw new ReportQueryError('REPORT_QUERY_TOO_EXPENSIVE', 422);
  return definition;
}

export interface ConversionRate { numerator: number; denominator: number; value: number | null }
export function conversionRate(numerator: number, denominator: number): ConversionRate {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator < 0 || denominator < 0 || numerator > denominator) throw new ReportQueryError('REPORT_METRIC_INVALID');
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

export function utcWindow(from: Date, to: Date): { from: string; to: string } {
  if (from >= to) throw new ReportQueryError('REPORT_DATE_RANGE_INVALID');
  return { from: from.toISOString(), to: to.toISOString() };
}

