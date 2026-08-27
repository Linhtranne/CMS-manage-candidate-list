import type { components } from '@cms/contracts';

type ReportMetric = components['schemas']['ReportMetric'];
type FunnelStage = components['schemas']['ReportFunnelStage'];

function dimensionOf(key: string): string | undefined {
  return key.split(':', 2)[1]?.toUpperCase();
}

const metricReportCodes: Record<string, string> = {
  candidates: 'candidate_inventory',
  applications: 'application_conversion',
  passed: 'application_conversion',
  journeyCompletion: 'journey_progress',
  referral: 'application_conversion',
  manual: 'application_conversion',
  import: 'application_conversion',
  activeOrders: 'order_pipeline',
  filledOrders: 'order_pipeline',
  atRiskJourneys: 'journey_progress',
  averageJourneyDays: 'journey_progress',
  replySla: 'email_operations',
  unmatched: 'email_operations',
  overdueTasks: 'task_workload',
  averageReplyMinutes: 'email_operations',
  missingPhone: 'candidate_inventory',
  duplicateCandidates: 'candidate_inventory'
};

const metricDefaultDimensions: Record<string, string> = {
  passed: 'PASSED',
  journeyCompletion: 'COMPLETED'
};

export function reportCodeForMetricKey(key: string): string | undefined {
  const [keyCode] = key.split(':', 2);
  return keyCode.includes('_') ? keyCode : metricReportCodes[keyCode];
}

export function reportDimensionForMetricKey(key: string): string | undefined {
  const [keyCode, keyDimension] = key.split(':', 2);
  return keyDimension?.toUpperCase() ?? metricDefaultDimensions[keyCode];
}

function reportDetailPath(code: string, dimension?: string): string {
  const params = dimension ? `?dimension=${encodeURIComponent(dimension)}` : '';
  return `/reports/${code}${params}`;
}

export function reportRecordsHref(code: string, dimension?: string): string {
  const raw = dimension?.split(':', 2).pop();
  const value = raw?.toUpperCase();
  switch (code) {
    case 'candidate_inventory':
      return value === 'POTENTIAL' ? '/candidates?view=potential' : value === 'PAUSED' ? '/candidates?view=paused' : value === 'MISSINGPHONE' ? '/candidates?view=missing-contact' : value === 'DUPLICATECANDIDATES' ? '/candidates?view=duplicates' : '/candidates?view=all';
    case 'application_conversion':
      return value === 'PASSED' ? '/applications?view=passed' : value === 'IN_INTERVIEW_PROCESS' ? '/applications?view=waiting-result' : value === 'FAILED' ? '/applications?view=failed' : value === 'WITHDRAWN' ? '/applications?view=withdrawn' : value === 'REFERRAL' ? '/applications?source=REFERRAL' : value === 'MANUAL' || value === 'MANUAL_MATCH' ? '/applications?source=MANUAL_MATCH' : value === 'IMPORT' ? '/applications?source=IMPORT' : '/applications?view=screening';
    case 'order_pipeline':
      return '/orders?view=all';
    case 'journey_progress':
      return value === 'COMPLETED' || value === 'JOURNEYCOMPLETION' ? '/supply-journeys?view=completed' : value === 'BLOCKED' || value === 'ON_HOLD' || value === 'ATRISKJOURNEYS' ? '/supply-journeys?view=at-risk' : value === 'ACTIVE' ? '/supply-journeys?view=active' : '/supply-journeys?view=all';
    case 'email_operations':
      return value === 'UNMATCHED' ? '/mailbox?view=unmatched' : value === 'NEEDS_ACTION' || value === 'REPLYSLA' ? '/mailbox?view=needs-action' : value === 'SENT' ? '/mailbox?view=sent' : value === 'CLOSED' ? '/mailbox?view=completed' : '/mailbox?view=all';
    case 'task_workload':
      return value === 'OVERDUE' || value === 'OVERDUETASKS' ? '/work?view=overdue' : '/work?view=all';
    default:
      return '/reports';
  }
}

export function funnelRecordsHref(stageKey: string): string {
  const key = stageKey.toUpperCase();
  if (key === 'CANDIDATES') return '/candidates?view=all';
  if (key === 'APPLICATIONS' || key === 'MATCHED') return '/applications?view=screening';
  if (key === 'INTERVIEWED') return '/applications?view=interviewed';
  if (key === 'IN_INTERVIEW_PROCESS') return '/applications?view=waiting-result';
  if (key === 'PASSED') return '/applications?view=passed';
  if (key === 'SUPPLIED') return '/supply-journeys?view=completed';
  return '/applications?view=screening';
}

export function reportMetricDrilldownHref(metric: ReportMetric): string {
  const [keyCode, keyDimension] = metric.key.split(':', 2);
  const code = reportCodeForMetricKey(metric.key);
  if (code) return reportDetailPath(code, keyDimension ?? dimensionOf(metric.key) ?? metricDefaultDimensions[keyCode]);
  if (metric.drilldownHref.startsWith('/reports/')) return metric.drilldownHref;
  return '/reports';
}

export function reportFunnelDrilldownHref(stage: FunnelStage): string {
  return reportDetailPath('funnel', stage.key);
}
