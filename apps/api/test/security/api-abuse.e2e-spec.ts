import { describe, expect, it } from 'vitest';
import { validateReportQuery } from '../../src/modules/tasks-reporting/domain/report.rules.js';
describe('API abuse guard corpus', () => {
  it('rejects unsupported report grouping and invalid timezone', () => {
    expect(() => validateReportQuery({ code: 'task_workload', from: new Date('2026-01-01'), to: new Date('2026-01-02'), timezone: 'UTC', groupBy: ['email'] })).toThrow(/REPORT_FILTER_UNSUPPORTED/);
    expect(() => validateReportQuery({ code: 'task_workload', from: new Date('2026-01-01'), to: new Date('2026-01-02'), timezone: 'Not/AZone' })).toThrow(/REPORT_TIMEZONE_INVALID/);
  });
});
