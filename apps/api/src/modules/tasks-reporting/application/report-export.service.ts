import { createHash } from 'node:crypto';
import { ReportQueryError } from '../domain/report.rules.js';

export interface ExportScope { actorId: string; teamId?: string; scope: 'SELF' | 'TEAM'; }
export interface ExportRequest { reportCode: string; format: 'CSV' | 'XLSX'; purpose: string; includedFields: string[]; filters: Record<string, string | string[]>; }
export interface ExportJobRepository { create(input: ExportRequest & { requesterId: string; scopeSnapshot: ExportScope; requestHash: string }): Promise<Record<string, unknown>>; findScoped(id: string, scope: ExportScope): Promise<Record<string, unknown> | null>; }
export class ReportExportService {
  constructor(private readonly repository: ExportJobRepository, private readonly enabled = false) {}
  async create(input: ExportRequest, scope: ExportScope): Promise<Record<string, unknown>> {
    if (!this.enabled) throw new ReportQueryError('REPORT_EXPORT_DISABLED', 503);
    if (!input.purpose?.trim()) throw new ReportQueryError('REPORT_EXPORT_PURPOSE_REQUIRED');
    if (input.format !== 'CSV') throw new ReportQueryError('REPORT_EXPORT_FORMAT_NOT_ENABLED');
    if (input.includedFields.some((field) => /password|token|secret|pii|passport|email/i.test(field))) throw new ReportQueryError('REPORT_EXPORT_FIELD_RESTRICTED', 403);
    const requestHash = createHash('sha256').update(JSON.stringify({ input, scope })).digest('hex');
    return this.repository.create({ ...input, requesterId: scope.actorId, scopeSnapshot: scope, requestHash });
  }
  async get(id: string, scope: ExportScope): Promise<Record<string, unknown>> { const job = await this.repository.findScoped(id, scope); if (!job) throw new ReportQueryError('REPORT_EXPORT_NOT_FOUND', 404); return job; }
}
