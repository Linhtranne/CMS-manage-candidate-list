import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { ExportJobRepository, ExportRequest, ExportScope } from '../application/report-export.service.js';
@Injectable()
export class ReportExportPrismaRepository implements ExportJobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async create(input: ExportRequest & { requesterId: string; scopeSnapshot: ExportScope; requestHash: string }): Promise<Record<string, unknown>> { const row = await this.prisma.reportExportJob.create({ data: { reportCode: input.reportCode, format: input.format, requesterId: input.requesterId, purpose: input.purpose.trim(), scopeSnapshot: input.scopeSnapshot as unknown as Prisma.InputJsonValue, includedFields: input.includedFields as unknown as Prisma.InputJsonValue, status: 'QUEUED' } }); return { id: row.id, reportCode: row.reportCode, format: row.format, status: row.status, createdAt: row.createdAt, requestedBy: row.requesterId }; }
  async findScoped(id: string, scope: ExportScope): Promise<Record<string, unknown> | null> { const row = await this.prisma.reportExportJob.findFirst({ where: { id, requesterId: scope.actorId } }); return row ? { id: row.id, reportCode: row.reportCode, format: row.format, status: row.status, createdAt: row.createdAt, requestedBy: row.requesterId, expiresAt: row.expiresAt } : null; }
}
