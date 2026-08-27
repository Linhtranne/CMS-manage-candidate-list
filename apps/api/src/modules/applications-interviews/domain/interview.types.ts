export const INTERVIEW_STATUSES = ['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
export type InterviewStatus = typeof INTERVIEW_STATUSES[number];
export const INTERVIEW_RESULTS = ['PENDING', 'ADVANCE_NEXT_ROUND', 'PASS', 'FAIL'] as const;
export type InterviewResult = typeof INTERVIEW_RESULTS[number];
export type InterviewMode = 'ONLINE' | 'IN_PERSON';

export class InterviewDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;
  constructor(code: string, messageKey: string, statusCode = 422) { super(messageKey); this.name = 'InterviewDomainError'; this.code = code; this.messageKey = messageKey; this.statusCode = statusCode; }
}

export function validateSchedule(input: { scheduledAt: Date; scheduledEndAt: Date; timeZone: string; mode: InterviewMode; participants: string[]; meetingUrl?: string | null; location?: string | null }): void {
  if (Number.isNaN(input.scheduledAt.getTime()) || Number.isNaN(input.scheduledEndAt.getTime()) || input.scheduledEndAt <= input.scheduledAt) throw new InterviewDomainError('INVALID_INTERVIEW_SCHEDULE', 'errors.invalidInterviewSchedule');
  if (!input.timeZone.trim() || input.participants.length === 0 || new Set(input.participants).size !== input.participants.length) throw new InterviewDomainError('INVALID_INTERVIEW_SCHEDULE', 'errors.invalidInterviewSchedule');
  if (input.mode === 'ONLINE' && !input.meetingUrl?.trim()) throw new InterviewDomainError('MEETING_URL_REQUIRED', 'errors.meetingUrlRequired');
  if (input.mode === 'IN_PERSON' && !input.location?.trim()) throw new InterviewDomainError('LOCATION_REQUIRED', 'errors.locationRequired');
}
