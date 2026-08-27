import {
  CANDIDATE_CONTACTABILITY_STATUSES,
  CANDIDATE_READINESS_STATUSES,
  CANDIDATE_RECORD_STATUSES,
  type CandidateContactabilityStatus,
  type CandidateReadinessStatus,
  type CandidateRecordStatus,
} from './candidate.types.js';

export class CandidateDomainError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 422) {
    super(`${code}: ${message}`);
    this.name = 'CandidateDomainError';
  }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new CandidateDomainError('INVALID_CANDIDATE_INPUT', `${field} is required`);
  return value.trim();
}

export function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new CandidateDomainError('INVALID_EMAIL', 'email is invalid');
  return normalized;
}

export function normalizePhone(value: string): string {
  const normalized = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new CandidateDomainError('INVALID_PHONE', 'phone must be E.164');
  return normalized;
}

export function normalizePassport(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z0-9]{5,32}$/.test(normalized)) throw new CandidateDomainError('INVALID_PASSPORT', 'passport is invalid');
  return normalized;
}

export function validateCandidateInput(input: {
  name: string;
  industryLabels: string[];
  occupation: string;
  japaneseLevel: string;
  source: string;
  email?: string | null;
  phone?: string | null;
  passportNumber?: string | null;
  address?: string | null;
  readinessStatus?: CandidateReadinessStatus;
  contactabilityStatus?: CandidateContactabilityStatus;
  recordStatus?: CandidateRecordStatus;
}) {
  const name = requiredText(input.name, 'name');
  const industryLabels = [...new Set((input.industryLabels ?? []).map((label) => requiredText(label, 'industryLabel')))];
  if (!industryLabels.length) throw new CandidateDomainError('INVALID_CANDIDATE_INPUT', 'industryLabels is required');
  const readinessStatus = input.readinessStatus ?? 'POTENTIAL';
  const contactabilityStatus = input.contactabilityStatus ?? 'CONTACTABLE';
  const recordStatus = input.recordStatus ?? 'ACTIVE';
  if (!CANDIDATE_READINESS_STATUSES.includes(readinessStatus)) throw new CandidateDomainError('INVALID_READINESS_STATUS', 'readinessStatus is invalid');
  if (!CANDIDATE_CONTACTABILITY_STATUSES.includes(contactabilityStatus)) throw new CandidateDomainError('INVALID_CONTACTABILITY_STATUS', 'contactabilityStatus is invalid');
  if (!CANDIDATE_RECORD_STATUSES.includes(recordStatus)) throw new CandidateDomainError('INVALID_RECORD_STATUS', 'recordStatus is invalid');
  return {
    name,
    industryLabels,
    occupation: requiredText(input.occupation, 'occupation'),
    japaneseLevel: requiredText(input.japaneseLevel, 'japaneseLevel'),
    source: requiredText(input.source, 'source'),
    email: input.email?.trim() ? normalizeEmail(input.email) : null,
    phone: input.phone?.trim() ? normalizePhone(input.phone) : null,
    passportNumber: input.passportNumber?.trim() ? normalizePassport(input.passportNumber) : null,
    address: input.address?.trim() || null,
    readinessStatus,
    contactabilityStatus,
    recordStatus,
  };
}

export function assertArchiveAllowed(input: { recordStatus: CandidateRecordStatus; activeWorkCount: number; reason?: string }): void {
  if (input.recordStatus === 'ARCHIVED') return;
  if (input.activeWorkCount > 0) throw new CandidateDomainError('CANDIDATE_HAS_ACTIVE_WORK', 'candidate has active application or journey', 409);
  if (!input.reason?.trim()) throw new CandidateDomainError('REASON_REQUIRED', 'archive reason is required');
}

function validateSchemaType(value: unknown, expected: string): boolean {
  if (expected === 'string') return typeof value === 'string';
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (expected === 'boolean') return typeof value === 'boolean';
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  return true;
}

export function validateProfileAttributes(value: Record<string, unknown> | undefined, schema?: Record<string, unknown>): Record<string, unknown> {
  const attributes = value ?? {};
  if (Array.isArray(attributes) || typeof attributes !== 'object') throw new CandidateDomainError('INVALID_PROFILE_ATTRIBUTES', 'attributes must be an object');
  if (Object.keys(attributes).some((key) => key.startsWith('$') || key.startsWith('__'))) throw new CandidateDomainError('INVALID_PROFILE_ATTRIBUTES', 'reserved schema keys are not allowed');
  if (schema) {
    if (schema.type !== 'object') throw new CandidateDomainError('INVALID_PROFILE_SCHEMA', 'profile schema must describe an object');
    const properties = schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties) ? schema.properties as Record<string, unknown> : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];
    for (const key of required) if (!(key in attributes)) throw new CandidateDomainError('PROFILE_ATTRIBUTE_REQUIRED', `${key} is required by the approved profile schema`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(attributes)) if (!(key in properties)) throw new CandidateDomainError('PROFILE_ATTRIBUTE_NOT_ALLOWED', `${key} is not allowed by the approved profile schema`);
    }
    for (const [key, definition] of Object.entries(properties)) {
      if (!(key in attributes) || !definition || typeof definition !== 'object' || Array.isArray(definition)) continue;
      const expected = (definition as Record<string, unknown>).type;
      if (typeof expected === 'string' && !validateSchemaType(attributes[key], expected)) throw new CandidateDomainError('PROFILE_ATTRIBUTE_INVALID', `${key} does not match the approved profile schema`);
    }
  }
  return attributes;
}

export function maskEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const [local, domain] = value.split('@');
  if (!domain) return '******';
  return `${local.slice(0, 1)}****@${domain}`;
}

export function maskPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  return `******${value.slice(-4)}`;
}
