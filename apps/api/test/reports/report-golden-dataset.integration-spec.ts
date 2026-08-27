import { describe, expect, it } from 'vitest';
import { ReportQueryService } from '../../src/modules/tasks-reporting/application/report-query.service.js';
describe('canonical report query', () => {
  it('returns null for zero denominator and preserves [from,to) window', async () => {
    const repository = { query: async () => [{ dimensionKey: 'all', asOf: new Date('2026-08-01T00:00:00Z'), payload: { numerator: 0, denominator: 0 } }] };
    const result = await new ReportQueryService(repository as never).query({ code: 'candidate_inventory', from: new Date('2026-08-01T00:00:00Z'), to: new Date('2026-08-02T00:00:00Z'), timezone: 'Asia/Tokyo' }, { actorId: 'u1', scope: 'SELF' });
    expect(result.value).toBeNull(); expect(result.window.to).toBe('2026-08-02T00:00:00.000Z');
  });
  it('rejects an unbounded expensive query', async () => { await expect(new ReportQueryService({ query: async () => [] } as never).query({ code: 'candidate_inventory', from: new Date('2020-01-01'), to: new Date('2026-01-01'), timezone: 'UTC' }, { actorId: 'u1', scope: 'SELF' })).rejects.toMatchObject({ code: 'REPORT_QUERY_TOO_EXPENSIVE' }); });
});
