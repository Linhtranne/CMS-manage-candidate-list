import { describe, expect, it } from 'vitest';
import {
  CatalogDomainError,
  assertCatalogTransition,
  validateCatalogDraft,
  validateQuestionSnapshot,
} from '../../src/modules/catalog/domain/catalog.rules.js';

describe('catalog versioning rules', () => {
  it('allows only DRAFT -> ACTIVE -> RETIRED transitions', () => {
    expect(assertCatalogTransition('DRAFT', 'ACTIVE')).toBeUndefined();
    expect(assertCatalogTransition('ACTIVE', 'RETIRED')).toBeUndefined();
    expect(() => assertCatalogTransition('ACTIVE', 'DRAFT')).toThrow(CatalogDomainError);
    expect(() => assertCatalogTransition('RETIRED', 'ACTIVE')).toThrow(CatalogDomainError);
  });

  it('requires a stable code and Vietnamese label for a draft', () => {
    expect(() => validateCatalogDraft({ type: 'INDUSTRY', code: 'x', labelVi: '' })).toThrow(/INVALID_CATALOG_LABEL/);
    expect(() => validateCatalogDraft({ type: 'INDUSTRY', code: 'x', labelVi: 'Ngành' })).toThrow(/INVALID_CATALOG_CODE/);
    expect(validateCatalogDraft({ type: 'INDUSTRY', code: 'it', labelVi: 'Công nghệ thông tin' })).toEqual({
      type: 'INDUSTRY',
      code: 'IT',
      labelVi: 'Công nghệ thông tin',
    });
  });

  it('rejects an invalid or ambiguous question snapshot', () => {
    expect(() => validateQuestionSnapshot([])).toThrow(/question/i);
    expect(() => validateQuestionSnapshot([
      { key: 'q1', order: 1, text: { vi: 'Một câu' }, scoringRule: 'SINGLE' },
      { key: 'q1', order: 2, text: { vi: 'Trùng key' }, scoringRule: 'SINGLE' },
    ])).toThrow(/unique/i);
    expect(validateQuestionSnapshot([
      { key: 'q1', order: 1, text: { vi: 'Một câu' }, scoringRule: 'SINGLE' },
    ])).toHaveLength(1);
  });
});
