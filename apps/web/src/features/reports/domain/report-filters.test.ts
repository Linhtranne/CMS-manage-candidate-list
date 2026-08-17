import { describe, expect, it } from 'vitest';
import { normalizeReportFilters } from './report-filters';
import { normalizeMetric } from './metric';

describe('report domain', () => {
  it('keeps numerator, denominator and timezone in a conversion metric', () => {
    expect(normalizeMetric({ numerator: 18, denominator: 60, timeZone: 'Asia/Ho_Chi_Minh' })).toEqual({ numerator: 18, denominator: 60, rate: 0.3, label: '18/60 — 30%', timeZone: 'Asia/Ho_Chi_Minh' });
  });

  it('normalizes only supported URL filters and drops blanks', () => {
    expect(normalizeReportFilters('?from=2026-08-01&to=2026-08-17&ownerId=u-1&unknown=x&clientId=')).toEqual({ from: '2026-08-01', to: '2026-08-17', ownerId: 'u-1' });
  });
});
