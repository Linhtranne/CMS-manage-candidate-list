import { createHash } from 'node:crypto';
import {
  evaluateApplicability,
  validateApplicabilityExpression,
  type ApplicabilityExpression,
} from './applicability-expression.js';

export const JOURNEY_TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type JourneyTemplateStatus = (typeof JOURNEY_TEMPLATE_STATUSES)[number];
export const RESIDENCE_CONTEXTS = ['OUTSIDE_JAPAN', 'IN_JAPAN'] as const;
export type ResidenceContext = (typeof RESIDENCE_CONTEXTS)[number];
export const JOURNEY_CASE_TYPES = ['NEW_ENTRY', 'JOB_CHANGE', 'STATUS_CHANGE', 'OTHER'] as const;
export type JourneyCaseType = (typeof JOURNEY_CASE_TYPES)[number];

export interface JourneyContext {
  residenceContext: ResidenceContext;
  visaRouteVersionId?: string | null;
  caseType: JourneyCaseType;
  sectorVersionId?: string | null;
  occupationVersionId?: string | null;
}

export interface EvidenceRequirement {
  category: string;
  requiredCount: number;
  sensitivity?: 'NORMAL' | 'PERSONAL' | 'HIGHLY_SENSITIVE';
}

export interface JourneyMilestoneTemplateEntity {
  id?: string;
  code: string;
  name: string;
  sequence: number;
  parallel: boolean;
  dependencyCodes: string[];
  applicability?: ApplicabilityExpression | null;
  dueSlaDays?: number | null;
  ownerRule: Record<string, unknown>;
  checklistSchema: Record<string, unknown>;
  evidenceRequirements: EvidenceRequirement[];
}

export interface JourneyTemplateVersionEntity {
  id: string;
  templateId: string;
  code: string;
  name: string;
  version: number;
  status: JourneyTemplateStatus;
  residenceContext: ResidenceContext;
  visaRouteVersionId: string | null;
  caseType: JourneyCaseType;
  sectorVersionId: string | null;
  occupationVersionId: string | null;
  applicability: ApplicabilityExpression | null;
  milestones: JourneyMilestoneTemplateEntity[];
  checksum: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JourneyTemplateDraftInput {
  templateId?: string;
  code: string;
  name: string;
  version: number;
  residenceContext: ResidenceContext;
  visaRouteVersionId?: string | null;
  caseType: JourneyCaseType;
  sectorVersionId?: string | null;
  occupationVersionId?: string | null;
  applicability?: ApplicabilityExpression | null;
  milestones: JourneyMilestoneTemplateEntity[];
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}

export class JourneyTemplateDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;
  constructor(code: string, messageKey = `errors.${code.toLowerCase()}`, statusCode = 422) {
    super(code);
    this.name = 'JourneyTemplateDomainError';
    this.code = code;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}

function assertString(value: unknown, code: string, min: number, max: number): asserts value is string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new JourneyTemplateDomainError(code);
}

function assertSafeSchema(schema: unknown, depth = 0): asserts schema is Record<string, unknown> {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || depth > 8) throw new JourneyTemplateDomainError('INVALID_CHECKLIST_SCHEMA');
  const allowed = new Set(['type', 'required', 'properties', 'items', 'enum', 'minLength', 'maxLength', 'minimum', 'maximum', 'format', 'additionalProperties']);
  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('$') || /script|function|eval|remote|uri/i.test(key) || !allowed.has(key)) throw new JourneyTemplateDomainError('INVALID_CHECKLIST_SCHEMA');
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) throw new JourneyTemplateDomainError('INVALID_CHECKLIST_SCHEMA');
    if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const child of Object.values(value)) assertSafeSchema(child, depth + 1);
    } else if (key === 'items') assertSafeSchema(value, depth + 1);
  }
}

function assertMilestoneGraph(milestones: readonly JourneyMilestoneTemplateEntity[]): void {
  const codes = new Set<string>();
  const sequences = new Set<number>();
  for (const milestone of milestones) {
    assertString(milestone.code, 'INVALID_MILESTONE_CODE', 2, 80);
    assertString(milestone.name, 'INVALID_MILESTONE_NAME', 2, 240);
    if (!Number.isInteger(milestone.sequence) || milestone.sequence < 1 || sequences.has(milestone.sequence)) throw new JourneyTemplateDomainError('INVALID_MILESTONE_SEQUENCE');
    if (codes.has(milestone.code)) throw new JourneyTemplateDomainError('DUPLICATE_MILESTONE_CODE');
    if (!Number.isInteger(milestone.dueSlaDays ?? 0) || (milestone.dueSlaDays ?? 0) < 0 || (milestone.dueSlaDays ?? 0) > 3650) throw new JourneyTemplateDomainError('INVALID_MILESTONE_SLA');
    if (!milestone.ownerRule || typeof milestone.ownerRule !== 'object' || Array.isArray(milestone.ownerRule)) throw new JourneyTemplateDomainError('INVALID_MILESTONE_OWNER_RULE');
    assertSafeSchema(milestone.checklistSchema);
    if (!Array.isArray(milestone.evidenceRequirements) || milestone.evidenceRequirements.some((requirement) => !requirement.category || !Number.isInteger(requirement.requiredCount) || requirement.requiredCount < 0)) throw new JourneyTemplateDomainError('INVALID_EVIDENCE_REQUIREMENT');
    if (milestone.applicability) validateApplicabilityExpression(milestone.applicability);
    codes.add(milestone.code);
    sequences.add(milestone.sequence);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byCode = new Map(milestones.map((milestone) => [milestone.code, milestone]));
  const visit = (code: string): void => {
    if (visiting.has(code)) throw new JourneyTemplateDomainError('MILESTONE_DEPENDENCY_CYCLE');
    if (visited.has(code)) return;
    const current = byCode.get(code);
    if (!current) throw new JourneyTemplateDomainError('UNKNOWN_MILESTONE_DEPENDENCY');
    visiting.add(code);
    for (const dependency of current.dependencyCodes) visit(dependency);
    visiting.delete(code);
    visited.add(code);
  };
  for (const milestone of milestones) visit(milestone.code);
}

export function validateJourneyTemplateDefinition(input: JourneyTemplateDraftInput | JourneyTemplateVersionEntity): void {
  assertString(input.code, 'INVALID_TEMPLATE_CODE', 2, 80);
  assertString(input.name, 'INVALID_TEMPLATE_NAME', 2, 160);
  if (!Number.isInteger(input.version) || input.version < 1) throw new JourneyTemplateDomainError('INVALID_TEMPLATE_VERSION');
  if (!RESIDENCE_CONTEXTS.includes(input.residenceContext)) throw new JourneyTemplateDomainError('INVALID_RESIDENCE_CONTEXT');
  if (!JOURNEY_CASE_TYPES.includes(input.caseType)) throw new JourneyTemplateDomainError('INVALID_CASE_TYPE');
  if (input.applicability) validateApplicabilityExpression(input.applicability);
  if (input.effectiveFrom && input.effectiveTo && input.effectiveFrom >= input.effectiveTo) throw new JourneyTemplateDomainError('INVALID_EFFECTIVE_WINDOW');
  if (!Array.isArray(input.milestones) || input.milestones.length === 0) throw new JourneyTemplateDomainError('TEMPLATE_MILESTONES_REQUIRED');
  assertMilestoneGraph(input.milestones);
}

export function computeJourneyTemplateChecksum(input: JourneyTemplateDraftInput): string {
  validateJourneyTemplateDefinition(input);
  const canonical = JSON.stringify({
    code: input.code.trim().toUpperCase(), name: input.name.trim(), version: input.version,
    residenceContext: input.residenceContext, visaRouteVersionId: input.visaRouteVersionId ?? null,
    caseType: input.caseType, sectorVersionId: input.sectorVersionId ?? null, occupationVersionId: input.occupationVersionId ?? null,
    applicability: input.applicability ?? null, milestones: input.milestones,
    effectiveFrom: input.effectiveFrom?.toISOString() ?? null, effectiveTo: input.effectiveTo?.toISOString() ?? null,
  });
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export function assertJourneyTemplateTransition(from: JourneyTemplateStatus, to: JourneyTemplateStatus): void {
  const allowed: Record<JourneyTemplateStatus, readonly JourneyTemplateStatus[]> = { DRAFT: ['ACTIVE'], ACTIVE: ['RETIRED'], RETIRED: [] };
  if (!allowed[from]?.includes(to)) throw new JourneyTemplateDomainError('INVALID_TEMPLATE_STATUS_TRANSITION');
}

export interface JourneyTemplateApproval { decisionId: 'DEC-004'; artifactChecksum: string; scope: string }
function assertApproval(approval: JourneyTemplateApproval | undefined): asserts approval is JourneyTemplateApproval {
  if (!approval || approval.decisionId !== 'DEC-004' || !/^sha256:[0-9a-f]{64}$/i.test(approval.artifactChecksum) || !approval.scope.trim()) {
    throw new JourneyTemplateDomainError('DECISION_REQUIRED', 'errors.decisionRequired', 403);
  }
}

function isEffective(template: JourneyTemplateVersionEntity, at: Date): boolean {
  return (!template.effectiveFrom || template.effectiveFrom <= at) && (!template.effectiveTo || template.effectiveTo > at);
}

function matches(template: JourneyTemplateVersionEntity, context: JourneyContext): boolean {
  if (template.residenceContext !== context.residenceContext || template.caseType !== context.caseType) return false;
  if (template.visaRouteVersionId !== null && template.visaRouteVersionId !== context.visaRouteVersionId) return false;
  if (template.sectorVersionId !== null && template.sectorVersionId !== context.sectorVersionId) return false;
  if (template.occupationVersionId !== null && template.occupationVersionId !== context.occupationVersionId) return false;
  return !template.applicability || evaluateApplicability(template.applicability, context);
}

export function templateSpecificity(template: JourneyTemplateVersionEntity): number {
  if (template.occupationVersionId !== null) return 4;
  if (template.sectorVersionId !== null) return 3;
  if (template.visaRouteVersionId !== null) return 2;
  return 1;
}

export function selectApplicableTemplate(templates: readonly JourneyTemplateVersionEntity[], context: JourneyContext, at = new Date()): JourneyTemplateVersionEntity {
  const applicable = templates.filter((template) => template.status === 'ACTIVE' && isEffective(template, at) && matches(template, context));
  if (applicable.length === 0) throw new JourneyTemplateDomainError('JOURNEY_TEMPLATE_NOT_APPLICABLE', 'errors.journeyTemplateNotApplicable', 422);
  const maxSpecificity = Math.max(...applicable.map(templateSpecificity));
  const best = applicable.filter((template) => templateSpecificity(template) === maxSpecificity);
  if (best.length !== 1) throw new JourneyTemplateDomainError('JOURNEY_TEMPLATE_AMBIGUOUS', 'errors.journeyTemplateAmbiguous', 409);
  return best[0];
}

export function assertTemplateApprovalMatches(template: JourneyTemplateVersionEntity, approval: JourneyTemplateApproval | undefined): void {
  assertApproval(approval);
  if (approval.artifactChecksum.toLowerCase() !== template.checksum.toLowerCase()) throw new JourneyTemplateDomainError('TEMPLATE_CHECKSUM_MISMATCH', 'errors.templateChecksumMismatch', 403);
}
