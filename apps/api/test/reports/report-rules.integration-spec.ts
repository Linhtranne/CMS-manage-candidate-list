import { describe, expect, it } from 'vitest';
import { conversionRate, REPORT_DEFINITIONS, ReportQueryError, validateReportQuery, utcWindow } from '../../src/modules/tasks-reporting/domain/report.rules.js';

describe('canonical report definitions', () => {
  it('registers all eight canonical reports with explicit denominator and filters', () => {
    expect(Object.keys(REPORT_DEFINITIONS)).toHaveLength(8);
    for (const definition of Object.values(REPORT_DEFINITIONS)) {
      expect(definition.definitionVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(definition.timeBasis).toBeTruthy();
      expect(definition.denominator).toBeTruthy();
      expect(definition.dimensions.length).toBeGreaterThan(0);
      expect(definition.filters.length).toBeGreaterThan(0);
    }
  });

  it('enforces allowlisted dimensions/timezone/range before query execution', () => {
    expect(validateReportQuery({ code: 'journey_progress', from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-02T00:00:00Z'), timezone: 'Asia/Tokyo', groupBy: ['milestoneStatus'], filters: { teamId: 'team-1' } }).code).toBe('journey_progress');
    expect(() => validateReportQuery({ code: 'journey_progress', from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-02T00:00:00Z'), timezone: 'Mars/Olympus', groupBy: [] })).toThrow(ReportQueryError);
    expect(() => validateReportQuery({ code: 'journey_progress', from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-02T00:00:00Z'), timezone: 'UTC', groupBy: ['emailBody'] })).toThrow(/FILTER/);
    expect(() => validateReportQuery({ code: 'journey_progress', from: new Date('2026-08-01T00:00:00Z'), to: new Date('2028-08-02T00:00:00Z'), timezone: 'UTC' })).toThrow(/EXPENSIVE/);
  });

  it('returns null conversion value for zero denominator and uses half-open UTC windows', () => {
    expect(conversionRate(0, 0)).toEqual({ numerator: 0, denominator: 0, value: null });
    expect(conversionRate(1, 4)).toEqual({ numerator: 1, denominator: 4, value: 0.25 });
    expect(utcWindow(new Date('2026-08-01T00:00:00Z'), new Date('2026-08-02T00:00:00Z'))).toEqual({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' });
  });
});

