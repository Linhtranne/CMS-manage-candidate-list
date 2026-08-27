import { ReportQueryError, conversionRate, validateReportQuery, type CanonicalReportCode, type ReportQuery } from '../domain/report.rules.js';
import { ReportProjectionRepository } from '../infrastructure/report-projection.repository.js';

export interface ReportScope { actorId: string; teamId?: string; scope: 'SELF' | 'TEAM'; }
export interface ReportResult { code: CanonicalReportCode; definitionVersion: string; window: { from: string; to: string; timezone: string }; numerator: number; denominator: number; value: number | null; rows: Array<{ dimensionKey: string; asOf: string; payload: Record<string, unknown> }>; }
export class ReportQueryService {
  constructor(private readonly projections: ReportProjectionRepository) {}
  async query(query: ReportQuery, scope: ReportScope): Promise<ReportResult> {
    const definition = validateReportQuery(query);
    const scopeKey = scope.scope === 'TEAM' && scope.teamId ? `TEAM:${scope.teamId}` : `SELF:${scope.actorId}`;
    const rows = await this.projections.query(definition.code, scopeKey, query.from, query.to);
    let numerator = 0; let denominator = 0;
    for (const row of rows) { if (typeof row.payload.numerator === 'number') numerator += row.payload.numerator; if (typeof row.payload.denominator === 'number') denominator += row.payload.denominator; }
    if (numerator > denominator && denominator > 0) throw new ReportQueryError('REPORT_METRIC_INVALID');
    const rate = conversionRate(numerator, denominator);
    return { code: definition.code, definitionVersion: definition.definitionVersion, window: { from: query.from.toISOString(), to: query.to.toISOString(), timezone: query.timezone }, numerator: rate.numerator, denominator: rate.denominator, value: rate.value, rows: rows.map((row) => ({ dimensionKey: row.dimensionKey, asOf: row.asOf.toISOString(), payload: row.payload })) };
  }
}
