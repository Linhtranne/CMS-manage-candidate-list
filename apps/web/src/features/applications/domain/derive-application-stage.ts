import type { components } from '@cms/contracts';

export type Application = components['schemas']['Application'];
export type Interview = components['schemas']['Interview'];
export type ApplicationStage = 'NEWLY_MATCHED' | 'WAITING_INTERVIEW' | 'WAITING_RESULT' | 'INTERVIEWED' | 'PASSED' | 'FAILED' | 'WITHDRAWN';

export function hasScheduledInterview(interviews: Interview[]) {
  return interviews.some((item) => item.scheduleStatus === 'SCHEDULED');
}

export function hasCompletedInterview(interviews: Interview[]) {
  return interviews.some((item) => item.scheduleStatus === 'COMPLETED');
}

export function hasPendingResult(interviews: Interview[]) {
  return interviews.some((item) => item.scheduleStatus === 'COMPLETED' && item.result === 'PENDING');
}

export function deriveApplicationStage(application: Pick<Application, 'status'>, interviews: Pick<Interview, 'scheduleStatus' | 'result'>[]): ApplicationStage {
  if (application.status === 'PASSED') return 'PASSED';
  if (application.status === 'FAILED') return 'FAILED';
  if (application.status === 'WITHDRAWN') return 'WITHDRAWN';
  if (interviews.some((item) => item.scheduleStatus === 'SCHEDULED')) return 'WAITING_INTERVIEW';
  if (interviews.some((item) => item.scheduleStatus === 'COMPLETED' && item.result === 'PENDING')) return 'WAITING_RESULT';
  if (interviews.some((item) => item.scheduleStatus === 'COMPLETED' && item.result !== 'PENDING')) return 'INTERVIEWED';
  return application.status === 'MATCHED' ? 'NEWLY_MATCHED' : 'INTERVIEWED';
}

export function matchesApplicationView(application: Application, view: string) {
  const stage = deriveApplicationStage(application, application.interviews);
  if (view === 'screening') return stage === 'NEWLY_MATCHED' || application.status === 'ON_HOLD';
  if (view === 'waiting-interview') return hasScheduledInterview(application.interviews) || stage === 'NEWLY_MATCHED';
  if (view === 'interviewed') return hasCompletedInterview(application.interviews) || stage === 'INTERVIEWED';
  if (view === 'waiting-result') return hasPendingResult(application.interviews);
  if (view === 'passed') return application.status === 'PASSED';
  if (view === 'closed') return application.status === 'FAILED' || application.status === 'WITHDRAWN';
  if (view === 'overdue') return Boolean(application.dueAt && new Date(application.dueAt).getTime() < Date.now() && !['PASSED', 'FAILED', 'WITHDRAWN'].includes(application.status));
  return true;
}
