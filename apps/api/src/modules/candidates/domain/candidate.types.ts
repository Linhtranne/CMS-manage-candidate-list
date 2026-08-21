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
  address?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  profiles: OccupationProfileEntity[];
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
