import type { TranslationKey, Translate } from '@/i18n/types';
import { getDomainLabel } from '@/i18n/domain-labels';

const reportCodeKeys = {
  candidate_inventory: 'reportCodes.candidateInventory',
  application_conversion: 'reportCodes.applicationConversion',
  order_pipeline: 'reportCodes.orderPipeline',
  journey_progress: 'reportCodes.journeyProgress',
  email_operations: 'reportCodes.emailOperations',
  task_workload: 'reportCodes.taskWorkload',
  interview_outcomes: 'reportCodes.interviewOutcomes',
  time_to_milestone: 'reportCodes.timeToMilestone'
} as const satisfies Record<string, TranslationKey>;

const reportDimensionKeys = {
  ACTIVE: 'reportDimensions.active',
  BLOCKED: 'reportDimensions.blocked',
  CANCELLED: 'reportDimensions.cancelled',
  CLOSED: 'reportDimensions.closed',
  COMPLETED: 'reportDimensions.completed',
  DRAFT: 'reportDimensions.draft',
  DELIVERED: 'reportDimensions.delivered',
  BOUNCED: 'reportDimensions.bounced',
  FAILED: 'reportDimensions.failed',
  FILLED: 'reportDimensions.filled',
  IN_INTERVIEW_PROCESS: 'reportDimensions.inInterviewProcess',
  IN_PROGRESS: 'reportDimensions.inProgress',
  IN_REVIEW: 'reportDimensions.inReview',
  MATCHED: 'reportDimensions.matched',
  NEW: 'reportDimensions.new',
  NEEDS_ACTION: 'reportDimensions.needsAction',
  NOT_APPLICABLE: 'reportDimensions.notApplicable',
  NOT_STARTED: 'reportDimensions.notStarted',
  OPEN: 'reportDimensions.open',
  ON_HOLD: 'reportDimensions.onHold',
  OVERDUE: 'reportDimensions.overdue',
  PAUSED: 'reportDimensions.paused',
  PENDING: 'reportDimensions.pending',
  PASSED: 'reportDimensions.passed',
  POTENTIAL: 'reportDimensions.potential',
  QUALIFIED: 'reportDimensions.qualified',
  QUEUED: 'reportDimensions.queued',
  READY: 'reportDimensions.ready',
  RECEIVED: 'reportDimensions.received',
  RETRY_WAIT: 'reportDimensions.retryWait',
  RECONCILING: 'reportDimensions.reconciling',
  SENT: 'reportDimensions.sent',
  SUPPLIED: 'reportDimensions.supplied',
  SUPPLYING: 'reportDimensions.supplying',
  UNMATCHED: 'reportDimensions.unmatched',
  WAIVED: 'reportDimensions.waived',
  WITHDRAWN: 'reportDimensions.withdrawn'
} as const satisfies Record<string, TranslationKey>;

const machineKeyPattern = /^[a-z][a-z0-9_]*(?::[A-Z0-9_]+)?$/;

function humanFallback(t: Translate, value: string, fallbackKey: TranslationKey): string {
  return machineKeyPattern.test(value) ? t(fallbackKey) : value;
}

export function getReportMetricLabel(t: Translate, key: string, fallbackLabel?: string): string {
  const [code, dimension] = key.split(':', 2);
  const codeKey = reportCodeKeys[code as keyof typeof reportCodeKeys];
  const codeLabel = codeKey
    ? t(codeKey)
    : humanFallback(t, fallbackLabel ?? code, 'reportCodes.unknown');

  if (!dimension) {
    if (codeKey) return codeLabel;
    const domainLabel = getDomainLabel(t, 'reportMetric', key);
    return domainLabel === key ? humanFallback(t, fallbackLabel ?? key, 'reportCodes.unknown') : domainLabel;
  }

  const dimensionKey = reportDimensionKeys[dimension as keyof typeof reportDimensionKeys];
  const dimensionLabel = dimensionKey
    ? t(dimensionKey)
    : humanFallback(t, dimension, 'reportDimensions.unknown');
  return `${codeLabel} · ${dimensionLabel}`;
}
