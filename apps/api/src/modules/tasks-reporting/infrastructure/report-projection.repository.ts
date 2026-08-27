import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { CanonicalReportCode } from '../domain/report.rules.js';

export interface ProjectionRow { dimensionKey: string; asOf: Date; payload: Record<string, unknown>; }
@Injectable()
export class ReportProjectionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async query(code: CanonicalReportCode, scopeKey: string, from: Date, to: Date): Promise<ProjectionRow[]> {
    const rows = await this.prisma.reportProjectionRow.findMany({ where: { reportCode: code, scopeKey, asOf: { gte: from, lt: to } }, orderBy: [{ asOf: 'asc' }, { dimensionKey: 'asc' }] });
    return rows.map((row) => ({ dimensionKey: row.dimensionKey, asOf: row.asOf, payload: (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {}) as Record<string, unknown> }));
  }
  async upsert(input: { code: CanonicalReportCode; scopeKey: string; dimensionKey: string; asOf: Date; payload: Record<string, unknown>; sourceWatermark: Date }): Promise<void> {
    await this.prisma.reportProjectionRow.upsert({ where: { reportCode_scopeKey_dimensionKey_asOf: { reportCode: input.code, scopeKey: input.scopeKey, dimensionKey: input.dimensionKey, asOf: input.asOf } }, create: { reportCode: input.code, scopeKey: input.scopeKey, dimensionKey: input.dimensionKey, asOf: input.asOf, payload: input.payload as Prisma.InputJsonValue, sourceWatermark: input.sourceWatermark }, update: { payload: input.payload as Prisma.InputJsonValue, sourceWatermark: input.sourceWatermark } });
  }
}
