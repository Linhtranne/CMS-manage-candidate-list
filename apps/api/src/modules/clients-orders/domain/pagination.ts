import { OrderDomainError } from './job-order.rules.js';

export interface CursorValue { sortValue: string; id: string }

export function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): CursorValue | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<CursorValue>;
    if (typeof parsed.sortValue !== 'string' || Number.isNaN(Date.parse(parsed.sortValue)) || typeof parsed.id !== 'string' || !parsed.id) throw new Error('invalid');
    return { sortValue: parsed.sortValue, id: parsed.id };
  } catch {
    throw new OrderDomainError('INVALID_CURSOR', 'errors.invalidCursor', 422);
  }
}

export function boundedLimit(value?: number): number {
  if (value === undefined) return 25;
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new OrderDomainError('INVALID_LIMIT', 'errors.invalidLimit', 422);
  return value;
}
