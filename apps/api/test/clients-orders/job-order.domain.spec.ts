import { describe, expect, it } from 'vitest';
import {
  assertJobOrderTransition,
  maskClientContact,
  validateJobOrderDraft,
  validateRequirementSnapshot,
} from '../../src/modules/clients-orders/domain/job-order.rules.js';

describe('job order domain rules', () => {
  it('rejects invalid quantity, deadline and missing catalog requirement', () => {
    expect(() => validateJobOrderDraft({ target: 0, deadline: new Date(Date.now() + 86_400_000), occupationCatalogVersionId: '' })).toThrow('INVALID_ORDER_TARGET');
    expect(() => validateJobOrderDraft({ target: 1, deadline: new Date(Date.now() - 1), occupationCatalogVersionId: 'catalog-1' })).toThrow('INVALID_ORDER_DEADLINE');
    expect(() => validateJobOrderDraft({ target: 1, deadline: new Date(Date.now() + 86_400_000), occupationCatalogVersionId: '' })).toThrow('CATALOG_REQUIREMENT_REQUIRED');
  });

  it('enforces the status table and reason requirements', () => {
    expect(() => assertJobOrderTransition('DRAFT', 'FILLED')).toThrow('INVALID_STATUS_TRANSITION');
    expect(() => assertJobOrderTransition('OPEN', 'ON_HOLD')).toThrow('ORDER_REASON_REQUIRED');
    expect(() => assertJobOrderTransition('OPEN', 'ON_HOLD', 'client paused')).not.toThrow();
    expect(() => assertJobOrderTransition('CLOSED', 'OPEN', 'reopen')).toThrow('INVALID_STATUS_TRANSITION');
  });

  it('normalizes a requirement snapshot and masks contact data', () => {
    expect(validateRequirementSnapshot({ catalogVersionId: 'catalog-1', occupation: 'ENGINEER', criteria: [' Japanese N2 ', ''] })).toEqual({
      catalogVersionId: 'catalog-1', occupation: 'ENGINEER', criteria: ['Japanese N2'],
    });
    expect(maskClientContact({ name: 'Nguyễn An', email: 'nguyen.an@example.com', phone: '+84901234567' })).toEqual({
      name: 'N******', email: 'n******@example.com', phone: '******4567',
    });
  });
});
