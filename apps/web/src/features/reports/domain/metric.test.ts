import { describe, expect, it } from 'vitest';
import { createTranslator } from '@/i18n/translate';
import { formatMetricValue, metricRate, normalizeMetric } from './metric';

describe('report metrics', () => {
  const vi = createTranslator('vi');
  const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
  const formatPercent = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 }).format(value);

  it('derives the displayed rate from numerator and denominator', () => {
    expect(formatMetricValue({ value: 6, numerator: 6, denominator: 16, unit: 'PERCENT' }, { days: 'ngày', minutes: 'phút', formatNumber, formatPercent })).toBe('6/16 — 38%');
  });

  it('clamps invalid rates instead of rendering more than one hundred percent', () => {
    expect(metricRate(12, 4)).toBe(1);
    expect(normalizeMetric({ numerator: 12, denominator: 4, timeZone: 'Asia/Tokyo' }).label).toBe('12/4 — 100%');
  });

  it('localizes machine report keys', () => {
    expect(vi('reportCodes.candidateInventory')).toBe('Kho ứng viên');
    expect(vi('reportDimensions.ready')).toBe('Sẵn sàng');
  });
});
