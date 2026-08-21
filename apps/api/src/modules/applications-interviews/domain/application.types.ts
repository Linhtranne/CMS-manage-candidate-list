export const APPLICATION_STATUSES = ['MATCHED', 'IN_INTERVIEW_PROCESS', 'ON_HOLD', 'PASSED', 'FAILED', 'WITHDRAWN'] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export const APPLICATION_SOURCES = ['MANUAL_MATCH', 'REFERRAL', 'IMPORT'] as const;
export type ApplicationSource = typeof APPLICATION_SOURCES[number];

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  MATCHED: ['IN_INTERVIEW_PROCESS', 'ON_HOLD', 'WITHDRAWN'],
  IN_INTERVIEW_PROCESS: ['ON_HOLD', 'PASSED', 'FAILED', 'WITHDRAWN'],
  ON_HOLD: ['MATCHED', 'IN_INTERVIEW_PROCESS', 'FAILED', 'WITHDRAWN'],
  PASSED: [], FAILED: [], WITHDRAWN: [],
};

export interface ApplicationContext { actorId: string; teamId?: string; scope: 'SELF' | 'TEAM'; requestId: string; correlationId: string; }

export class ApplicationDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;
  constructor(code: string, messageKey: string, statusCode = 422) { super(messageKey); this.name = 'ApplicationDomainError'; this.code = code; this.messageKey = messageKey; this.statusCode = statusCode; }
}

export function assertApplicationTransition(from: ApplicationStatus, to: ApplicationStatus, reason?: string): void {
  if (!APPLICATION_TRANSITIONS[from]?.includes(to)) throw new ApplicationDomainError('INVALID_STATUS_TRANSITION', 'errors.invalidStatusTransition', 422);
  if (['PASSED', 'FAILED', 'WITHDRAWN'].includes(to) && !reason?.trim()) throw new ApplicationDomainError('REQUIRED_FEEDBACK_MISSING', 'errors.requiredFeedbackMissing', 422);
}
