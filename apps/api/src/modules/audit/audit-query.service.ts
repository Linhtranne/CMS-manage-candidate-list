import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service.js';

export interface AuditQueryScope { actorId: string; teamId?: string; }
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}
  async list(input: { entityType?: string; entityId?: string; from?: Date; to?: Date; limit?: number }, scope: AuditQueryScope) {
    const rows = await this.prisma.auditEvent.findMany({ where: { ...(input.entityType ? { entityType: input.entityType } : {}), ...(input.entityId ? { entityId: input.entityId } : {}), ...(input.from || input.to ? { occurredAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lt: input.to } : {}) } } : {}), OR: [{ actorUserId: scope.actorId }, ...(scope.teamId ? [{ metadataJson: { path: ['teamId'], equals: scope.teamId } }] : [])] }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: Math.min(input.limit ?? 100, 100) });
    return rows.map((row) => ({ id: row.id, action: row.action, entityType: row.entityType, entityId: row.entityId, actorUserId: row.actorUserId, correlationId: row.correlationId, occurredAt: row.occurredAt, metadata: row.metadataJson }));
  }
}
