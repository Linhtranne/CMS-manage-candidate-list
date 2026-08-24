import { createHmac, timingSafeEqual } from 'node:crypto';
import { evaluateApplicability } from './applicability-expression.js';
import type { JourneyContext, JourneyTemplateVersionEntity } from './journey-template.js';

export const JOURNEY_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];
export const MILESTONE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'WAIVED', 'NOT_APPLICABLE'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface JourneyMilestoneSnapshot {
  id?: string;
  code: string;
  name: string;
  sequence: number;
  dependencyCodes: string[];
  status: MilestoneStatus;
  ownerUserId: string;
  dueAt: Date | null;
  completedAt: Date | null;
  blockerParty: string | null;
  blockerReason: string | null;
  expectedResolution: string | null;
  waiveReason: string | null;
  waivedBy: string | null;
  waivedAt: Date | null;
  notApplicableReason: string | null;
  checklistData: Record<string, unknown>;
  evidenceRequirement: unknown[];
  attemptNo: number;
  version: number;
}

export interface SupplyJourneyEntity {
  id: string;
  candidateId: string;
  applicationId: string;
  templateVersionId: string;
  templateChecksum: string;
  ownerUserId: string;
  teamId: string | null;
  status: JourneyStatus;
  contextSnapshot: JourneyContext;
  startedAt: Date;
  completedAt: Date | null;
  cancelReason: string | null;
  idempotencyKey: string;
  version: number;
  milestones: JourneyMilestoneSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationJourneyContext {
  applicationId: string;
  candidateId: string;
  ownerUserId: string;
  teamId: string | null;
  status: string;
  version: number;
  context: JourneyContext;
}

export class SupplyJourneyDomainError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly messageKey: string;
  constructor(code: string, statusCode = 422, messageKey = `errors.${code.toLowerCase()}`) {
    super(code);
    this.name = 'SupplyJourneyDomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.messageKey = messageKey;
  }
}

function canonicalContext(context: JourneyContext): string {
  return JSON.stringify({
    residenceContext: context.residenceContext,
    visaRouteVersionId: context.visaRouteVersionId ?? null,
    caseType: context.caseType,
    sectorVersionId: context.sectorVersionId ?? null,
    occupationVersionId: context.occupationVersionId ?? null,
  });
}

function contextHash(context: JourneyContext): string {
  return createHmac('sha256', 'journey-context-v1').update(canonicalContext(context)).digest('hex');
}

export interface PreviewTokenPayload {
  applicationId: string;
  applicationVersion: number;
  templateVersionId: string;
  templateChecksum: string;
  contextHash: string;
  expiresAt: number;
}

export function createPreviewToken(payload: Omit<PreviewTokenPayload, 'expiresAt'>, secret: string, now = Date.now(), ttlMs = 15 * 60 * 1000): string {
  if (!secret) throw new SupplyJourneyDomainError('PREVIEW_TOKEN_SECRET_MISSING', 500);
  const body = Buffer.from(JSON.stringify({ ...payload, expiresAt: now + ttlMs }), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifyPreviewToken(token: string, secret: string, now = Date.now()): PreviewTokenPayload {
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_EXPIRED', 409);
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_INVALID', 409);
  let payload: PreviewTokenPayload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PreviewTokenPayload; } catch { throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_INVALID', 409); }
  if (!payload.applicationId || !payload.templateVersionId || !payload.templateChecksum || !payload.contextHash || !Number.isInteger(payload.applicationVersion) || payload.expiresAt <= now) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_EXPIRED', 409);
  return payload;
}

export function assertJourneyStartApplication(application: ApplicationJourneyContext): void {
  if (application.status !== 'PASSED') throw new SupplyJourneyDomainError('APPLICATION_NOT_PASSED', 409);
}

export function buildMilestoneSnapshot(template: JourneyTemplateVersionEntity, ownerUserId: string, context: JourneyContext, startedAt: Date): JourneyMilestoneSnapshot[] {
  if (!ownerUserId.trim()) throw new SupplyJourneyDomainError('JOURNEY_OWNER_REQUIRED');
  const applicable = template.milestones.filter((milestone) => !milestone.applicability || evaluateApplicability(milestone.applicability, context));
  const applicableCodes = new Set(applicable.map((milestone) => milestone.code));
  return applicable.map((milestone) => ({
    code: milestone.code,
    name: milestone.name,
    sequence: milestone.sequence,
    dependencyCodes: milestone.dependencyCodes.filter((dependency) => applicableCodes.has(dependency)),
    status: 'NOT_STARTED' as const,
    ownerUserId,
    dueAt: milestone.dueSlaDays == null ? null : new Date(startedAt.getTime() + milestone.dueSlaDays * 24 * 60 * 60 * 1000),
    completedAt: null,
    blockerParty: null,
    blockerReason: null,
    expectedResolution: null,
    waiveReason: null,
    waivedBy: null,
    waivedAt: null,
    notApplicableReason: null,
    checklistData: {},
    evidenceRequirement: milestone.evidenceRequirements,
    attemptNo: 1,
    version: 1,
  }));
}

export function assertJourneyStatusTransition(from: JourneyStatus, to: JourneyStatus): void {
  const allowed: Record<JourneyStatus, readonly JourneyStatus[]> = { ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'], ON_HOLD: ['ACTIVE', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
  if (!allowed[from].includes(to)) throw new SupplyJourneyDomainError('INVALID_STATUS_TRANSITION', 409);
}

export function assertTemplateContextBinding(token: PreviewTokenPayload, application: ApplicationJourneyContext, template: JourneyTemplateVersionEntity): void {
  if (token.applicationId !== application.applicationId || token.applicationVersion !== application.version) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_STALE', 409);
  if (token.templateVersionId !== template.id || token.templateChecksum !== template.checksum || token.contextHash !== contextHash(application.context)) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_STALE', 409);
}

export function journeyContextFingerprint(context: JourneyContext): string { return contextHash(context); }

