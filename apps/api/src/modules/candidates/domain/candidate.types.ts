export const CANDIDATE_RECORD_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export const CANDIDATE_READINESS_STATUSES = ['POTENTIAL', 'QUALIFIED', 'READY', 'PAUSED', 'NOT_SUITABLE'] as const;
export const CANDIDATE_CONTACTABILITY_STATUSES = ['CONTACTABLE', 'TEMPORARILY_UNREACHABLE', 'DO_NOT_CONTACT'] as const;
export const OCCUPATION_PROFILE_STATUSES = ['PRIMARY', 'SECONDARY', 'ARCHIVED'] as const;

export type CandidateRecordStatus = typeof CANDIDATE_RECORD_STATUSES[number];
export type CandidateReadinessStatus = typeof CANDIDATE_READINESS_STATUSES[number];
export type CandidateContactabilityStatus = typeof CANDIDATE_CONTACTABILITY_STATUSES[number];
export type OccupationProfileStatus = typeof OCCUPATION_PROFILE_STATUSES[number];

export interface CandidateEntity {
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  industryLabels: string[];
  occupation: string;
  japaneseLevel: string;
  source: string;
  recordStatus: CandidateRecordStatus;
  readinessStatus: CandidateReadinessStatus;
  contactabilityStatus: CandidateContactabilityStatus;
  ownerId: string;
  ownerName?: string;
  teamId?: string;
  email?: string | null;
  phone?: string | null;
  passportNumber?: string | null;
  address?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  profiles: OccupationProfileEntity[];
  /** Read-model fields used by candidate list/detail views. */
  applicationCount?: number;
  operationalPhase?: 'POTENTIAL' | 'APPLYING' | 'PASSED' | 'SUPPLYING' | 'SUPPLIED';
  hasActiveJourney?: boolean;
  isPossibleDuplicate?: boolean;
  missingDocumentCount?: number;
  nextAction?: string;
  skills?: string[];
  yearsExperience?: number;
  desiredLocation?: string | null;
  applications?: CandidateApplicationSummary[];
  journeys?: CandidateJourneySummary[];
  emailCount?: number;
  files?: CandidateFileSummary[];
  notes?: string[];
  history?: CandidateHistorySummary[];
}

export interface CandidateApplicationSummary {
  id: string;
  order: { id: string; code: string; position: string };
  client: { id: string; name: string };
  owner: { id: string; name: string };
  status: string;
  source: string;
  appliedAt: string;
  lastActivityAt: string;
  dueAt: string | null;
  version: number;
  interviews: Array<Record<string, unknown>>;
  decisionReason: string | null;
}

export interface CandidateJourneySummary {
  id: string;
  status: string;
  candidate: { id: string; code: string; name: string };
  order: { id: string; code: string; position: string };
  client: { id: string; name: string };
  owner: { id: string; name: string };
  templateName: string;
  currentMilestone: string;
  nearestDueAt: string | null;
  progress: { completed: number; applicable: number };
  health: 'ON_TRACK' | 'OVERDUE' | 'AT_RISK' | 'COMPLETED';
}

export interface CandidateFileSummary {
  id: string;
  fileName: string;
  category: 'CV' | 'IDENTITY' | 'CERTIFICATE' | 'LANGUAGE' | 'OTHER';
  scanStatus: 'PENDING' | 'SAFE' | 'QUARANTINED' | 'REJECTED';
  uploadedAt: string;
  downloadUrl: string | null;
}

export interface CandidateHistorySummary {
  id: string;
  type: 'CREATED' | 'STATUS_CHANGED' | 'APPLICATION_CREATED' | 'JOURNEY_STARTED';
  occurredAt: string;
  actor: { id: string; name: string };
  summary: string;
}

export interface OccupationProfileEntity {
  id: string;
  candidateId: string;
  industryLabel: string;
  occupation: string;
  yearsExperience: number;
  skills: string[];
  desiredLocation?: string | null;
  attributes: Record<string, unknown>;
  schemaVersionId?: string | null;
  status: OccupationProfileStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateCommandContext {
  actorId: string;
  teamId?: string;
  requestId: string;
  correlationId: string;
  approvalId?: string;
}

export interface CandidateListQuery {
  query?: string;
  view?: string;
  industrySectorId?: string;
  readinessStatus?: CandidateReadinessStatus;
  contactabilityStatus?: CandidateContactabilityStatus;
  occupationId?: string;
  japaneseLevel?: string;
  skill?: string;
  desiredLocation?: string;
  source?: string;
  recordStatus?: CandidateRecordStatus;
  experience?: string;
  ownerId?: string;
  teamId?: string;
  scope?: 'SELF' | 'TEAM';
  cursor?: string;
  limit?: number;
}

export interface CandidatePage {
  items: CandidateEntity[];
  page: { nextCursor: string | null; hasMore: boolean };
}

export interface CandidateMatchEntity {
  id: string;
  code: string;
  name: string;
  industryLabel: string;
  occupation: string;
  japaneseLevel: string;
  readinessStatus: CandidateReadinessStatus;
  recordStatus: CandidateRecordStatus;
  hasActiveApplicationInOrder: boolean;
  hasActiveJourney: boolean;
  skills: string[];
  yearsExperience: number;
}
