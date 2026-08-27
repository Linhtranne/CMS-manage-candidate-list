import { describe, expect, it } from 'vitest';
import { reportFunnelDrilldownHref, reportMetricDrilldownHref } from './report-drilldown';

describe('report drilldown routes', () => {
  it('maps live API report links to report detail pages', () => {
    expect(reportMetricDrilldownHref({ key: 'application_conversion:IN_INTERVIEW_PROCESS', label: 'raw', value: 0.2, numerator: 1, denominator: 5, unit: 'PERCENT', asOf: '2026-08-26T00:00:00Z', drilldownHref: '/reports/application_conversion?dimension=IN_INTERVIEW_PROCESS' })).toBe('/reports/application_conversion?dimension=IN_INTERVIEW_PROCESS');
    expect(reportMetricDrilldownHref({ key: 'candidate_inventory:READY', label: 'raw', value: 0.5, numerator: 1, denominator: 2, unit: 'PERCENT', asOf: '2026-08-26T00:00:00Z', drilldownHref: '/reports/candidate_inventory?dimension=READY' })).toBe('/reports/candidate_inventory?dimension=READY');
  });

  it('maps funnel links to the funnel detail page', () => {
    expect(reportFunnelDrilldownHref({ key: 'IN_INTERVIEW_PROCESS', label: 'raw', numerator: 1, denominator: 6, rate: 1 / 6, drilldownHref: '/reports/funnel?dimension=IN_INTERVIEW_PROCESS' })).toBe('/reports/funnel?dimension=IN_INTERVIEW_PROCESS');
    expect(reportFunnelDrilldownHref({ key: 'PASSED', label: 'raw', numerator: 3, denominator: 6, rate: 0.5, drilldownHref: '/reports/funnel?dimension=PASSED' })).toBe('/reports/funnel?dimension=PASSED');
  });

  it('maps fixture metrics to their owning report detail page', () => {
    expect(reportMetricDrilldownHref({ key: 'passed', label: 'Passed', value: 0.3, numerator: 3, denominator: 10, unit: 'PERCENT', asOf: '2026-08-26T00:00:00Z', drilldownHref: '/applications?view=passed' })).toBe('/reports/application_conversion?dimension=PASSED');
  });
});
