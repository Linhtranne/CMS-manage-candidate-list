export const CATALOG_TYPES = ['INDUSTRY', 'OCCUPATION', 'VISA_ROUTE', 'SOURCE'] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];

export const CATALOG_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export interface CatalogDraftInput {
  type: string;
  code: string;
  labelVi: string;
}

export interface ValidatedCatalogDraft {
  type: CatalogType;
  code: string;
  labelVi: string;
}

export interface QuestionSnapshotItem {
  key: string;
  order: number;
  text: Record<string, string>;
  scoringRule: string;
}

export class CatalogDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;

  constructor(code: string, messageKey: string, statusCode = 422) {
    super(code);
    this.name = 'CatalogDomainError';
    this.code = code;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}

export function assertCatalogTransition(from: CatalogStatus, to: CatalogStatus): void {
  const allowed: Record<CatalogStatus, readonly CatalogStatus[]> = {
    DRAFT: ['ACTIVE'],
    ACTIVE: ['RETIRED'],
    RETIRED: [],
  };
  if (!allowed[from]?.includes(to)) {
    throw new CatalogDomainError('INVALID_CATALOG_STATUS_TRANSITION', 'errors.invalidCatalogStatusTransition');
  }
}

export function validateCatalogDraft(input: CatalogDraftInput): ValidatedCatalogDraft {
  const type = input.type.trim().toUpperCase() as CatalogType;
  if (!CATALOG_TYPES.includes(type)) {
    throw new CatalogDomainError('INVALID_CATALOG_TYPE', 'errors.invalidCatalogType');
  }
  const labelVi = input.labelVi.trim();
  if (labelVi.length < 2 || labelVi.length > 240) {
    throw new CatalogDomainError('INVALID_CATALOG_LABEL', 'errors.invalidCatalogLabel');
  }
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(code)) {
    throw new CatalogDomainError('INVALID_CATALOG_CODE', 'errors.invalidCatalogCode');
  }
  return { type, code, labelVi };
}

export function validateQuestionSnapshot(input: readonly unknown[]): QuestionSnapshotItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new CatalogDomainError('QUESTION_SNAPSHOT_EMPTY', 'errors.questionSnapshotEmpty');
  }
  const keys = new Set<string>();
  const orders = new Set<number>();
  const snapshot = input.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new CatalogDomainError('QUESTION_SNAPSHOT_INVALID', 'errors.questionSnapshotInvalid');
    }
    const value = candidate as Record<string, unknown>;
    const key = typeof value.key === 'string' ? value.key.trim() : '';
    const order = typeof value.order === 'number' ? value.order : NaN;
    const text = value.text && typeof value.text === 'object' && !Array.isArray(value.text)
      ? Object.fromEntries(Object.entries(value.text).filter(([, textValue]) => typeof textValue === 'string' && textValue.trim())) as Record<string, string>
      : {};
    const scoringRule = typeof value.scoringRule === 'string' ? value.scoringRule.trim() : '';
    if (keys.has(key) || orders.has(order)) {
      throw new CatalogDomainError('QUESTION_SNAPSHOT_NOT_UNIQUE', 'errors.questionSnapshotNotUnique');
    }
    if (!key || !Number.isInteger(order) || order < 1 || !text.vi || !scoringRule) {
      throw new CatalogDomainError('QUESTION_SNAPSHOT_INVALID', 'errors.questionSnapshotInvalid');
    }
    keys.add(key);
    orders.add(order);
    return { key, order, text, scoringRule };
  });
  return snapshot.sort((left, right) => left.order - right.order);
}
