import { Injectable } from '@nestjs/common';
import type { CanonicalReportCode } from '../domain/report.rules.js';
import { ReportProjectionRepository } from '../infrastructure/report-projection.repository.js';

@Injectable()
export class ReportProjectionProcessor {
  constructor(private readonly projections: ReportProjectionRepository) {}
  async apply(input: { code: CanonicalReportCode; scopeKey: string; dimensionKey: string; asOf: Date; payload: Record<string, unknown>; sourceWatermark: Date }): Promise<void> { await this.projections.upsert(input); }
}
