import { describe, expect, it } from 'vitest';
import { createTranslator } from '@/i18n/translate';
import { getReportMetricLabel } from './report-labels';

describe('getReportMetricLabel', () => {
  it('turns live report code and dimension keys into readable labels', () => {
    expect(getReportMetricLabel(createTranslator('vi'), 'candidate_inventory:READY')).toBe('Kho ứng viên · Sẵn sàng');
    expect(getReportMetricLabel(createTranslator('en'), 'order_pipeline:OPEN')).toBe('Job order pipeline · Open');
    expect(getReportMetricLabel(createTranslator('ja'), 'journey_progress:BLOCKED')).toBe('供給プロセスの進捗 · ブロック');
    expect(getReportMetricLabel(createTranslator('vi'), 'application_conversion:IN_INTERVIEW_PROCESS')).toBe('Chuyển đổi ứng tuyển · Đang phỏng vấn');
    expect(getReportMetricLabel(createTranslator('vi'), 'application_conversion:PASSED')).toBe('Chuyển đổi ứng tuyển · Đạt');
  });

  it('keeps known fixture labels stable', () => {
    expect(getReportMetricLabel(createTranslator('vi'), 'passed', 'Trúng tuyển')).toBe('Trúng tuyển');
  });
});
