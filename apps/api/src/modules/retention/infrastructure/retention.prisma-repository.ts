import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { RetentionRepository } from '../application/retention.service.js';
@Injectable()
export class RetentionPrismaRepository implements RetentionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async activeHold(entityType: string, entityId: string) { return Boolean(await this.prisma.legalHold.findFirst({ where: { entityType, entityId, status: 'ACTIVE' }, select: { id: true } })); }
  async createHold(input: { entityType: string; entityId: string; reason: string; placedBy: string }) { const row = await this.prisma.legalHold.create({ data: { entityType: input.entityType, entityId: input.entityId, reason: input.reason, placedBy: input.placedBy } }); return { id: row.id, entityType: row.entityType, entityId: row.entityId, status: row.status, createdAt: row.createdAt }; }
  async releaseHold(id: string, actorId: string) { await this.prisma.legalHold.update({ where: { id }, data: { status: 'RELEASED', releasedBy: actorId, releasedAt: new Date() } }); }
  async findPurgeCandidates(policyCode: string, before: Date) { void policyCode; void before; return [] as Array<{ entityType: string; entityId: string }>; }
  async markPurged(candidates: Array<{ entityType: string; entityId: string }>, actorId: string) { void candidates; void actorId; return undefined; }
}
