import type { ClientContact, JobOrderStatus, RequirementSnapshot } from './order.types.js';

export class OrderDomainError extends Error {
  constructor(readonly code: string, readonly messageKey: string, readonly statusCode = 422) {
    super(code);
    this.name = 'OrderDomainError';
  }
}

export function validateJobOrderDraft(input: { target: number; deadline: Date; occupationCatalogVersionId: string }): void {
  if (!Number.isInteger(input.target) || input.target < 1) throw new OrderDomainError('INVALID_ORDER_TARGET', 'errors.invalidOrderTarget');
  if (!(input.deadline instanceof Date) || Number.isNaN(input.deadline.valueOf()) || input.deadline.getTime() <= Date.now()) {
    throw new OrderDomainError('INVALID_ORDER_DEADLINE', 'errors.invalidOrderDeadline');
  }
  if (!input.occupationCatalogVersionId.trim()) throw new OrderDomainError('CATALOG_REQUIREMENT_REQUIRED', 'errors.catalogRequirementRequired');
}

export function validateRequirementSnapshot(input: unknown): RequirementSnapshot {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new OrderDomainError('INVALID_REQUIREMENT_SNAPSHOT', 'errors.invalidRequirementSnapshot');
  const value = input as Record<string, unknown>;
  const catalogVersionId = typeof value.catalogVersionId === 'string' ? value.catalogVersionId.trim() : '';
  const occupation = typeof value.occupation === 'string' ? value.occupation.trim().toUpperCase() : '';
  const criteria = Array.isArray(value.criteria) ? value.criteria.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
  if (!catalogVersionId || !occupation) throw new OrderDomainError('INVALID_REQUIREMENT_SNAPSHOT', 'errors.invalidRequirementSnapshot');
  return { ...value, catalogVersionId, occupation, criteria };
}

export function assertJobOrderTransition(from: JobOrderStatus, to: JobOrderStatus, reason?: string): void {
  const allowed: Record<JobOrderStatus, readonly JobOrderStatus[]> = {
    DRAFT: ['OPEN', 'CANCELLED'],
    OPEN: ['ON_HOLD', 'FILLED', 'CLOSED', 'CANCELLED'],
    ON_HOLD: ['OPEN', 'CLOSED', 'CANCELLED'],
    FILLED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
  };
  if (!allowed[from].includes(to)) throw new OrderDomainError('INVALID_STATUS_TRANSITION', 'errors.invalidStatusTransition', 422);
  if ((to === 'ON_HOLD' || to === 'CLOSED' || to === 'CANCELLED' || (from === 'ON_HOLD' && to === 'OPEN')) && !reason?.trim()) {
    throw new OrderDomainError('ORDER_REASON_REQUIRED', 'errors.orderReasonRequired', 422);
  }
}

export function maskClientContact(contact: ClientContact): ClientContact {
  const mask = (value: string): string => value.length <= 1 ? '*' : `${value[0]}${'*'.repeat(6)}`;
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  return {
    name: mask(contact.name.trim()),
    ...(email ? { email: `${mask(email.slice(0, email.indexOf('@')))}${email.slice(email.indexOf('@'))}` } : {}),
    ...(phone ? { phone: `${'*'.repeat(6)}${phone.slice(-4)}` } : {}),
  };
}
