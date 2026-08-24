import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { MilestoneRepository } from '../application/journey-milestone.service.js';
import type { JourneyScopeContext } from '../application/supply-journey.service.js';
import type { JourneyMilestoneSnapshot } from '../domain/supply-journey.aggregate.js';
import type { MilestoneEvidenceResult } from '../domain/journey-milestone.aggregate.js';

type MilestoneRow = { id: string; code: string; name: string; sequence: number; dependencyCodes: Prisma.JsonValue; status: string; ownerUserId: string; dueAt: Date | null; completedAt: Date | null; blockerParty: string | null; blockerReason: string | null; expectedResolution: string | null; waiveReason: string | null; waivedBy: string | null; waivedAt: Date | null; notApplicableReason: string | null; checklistData: Prisma.JsonValue; evidenceRequirement: Prisma.JsonValue; attemptNo: number; version: number };
type JourneyWithMilestones = { id: string; ownerUserId: string; teamId: string | null; milestones: MilestoneRow[] };
function array(value: Prisma.JsonValue): unknown[] { return Array.isArray(value) ? value : []; }
function object(value: Prisma.JsonValue): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function map(row: MilestoneRow): JourneyMilestoneSnapshot { return { id: row.id, code: row.code, name: row.name, sequence: row.sequence, dependencyCodes: array(row.dependencyCodes).filter((entry): entry is string => typeof entry === 'string'), status: row.status as JourneyMilestoneSnapshot['status'], ownerUserId: row.ownerUserId, dueAt: row.dueAt, completedAt: row.completedAt, blockerParty: row.blockerParty, blockerReason: row.blockerReason, expectedResolution: row.expectedResolution, waiveReason: row.waiveReason, waivedBy: row.waivedBy, waivedAt: row.waivedAt, notApplicableReason: row.notApplicableReason, checklistData: object(row.checklistData), evidenceRequirement: array(row.evidenceRequirement), attemptNo: row.attemptNo, version: row.version }; }

@Injectable()
export class JourneyMilestonePrismaRepository implements MilestoneRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}
  async withTransaction<T>(work: (repository: MilestoneRepository, transaction: unknown) => Promise<T>): Promise<T> { if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new JourneyMilestonePrismaRepository(transaction), transaction)); return work(this, this.prisma); }
  async findScoped(id: string, context: JourneyScopeContext) {
    const scope = context.scope === 'TEAM' && context.teamId ? { journey: { teamId: context.teamId } } : { journey: { ownerUserId: context.actorId } };
    const row = await this.prisma.journeyMilestone.findFirst({ where: { id, ...scope }, include: { journey: { select: { id: true, ownerUserId: true, teamId: true, milestones: { orderBy: { sequence: 'asc' } } } } } });
    if (!row) return null;
    const journey = row.journey as unknown as JourneyWithMilestones;
    return { milestone: map(row as unknown as MilestoneRow), all: journey.milestones.map(map), journeyId: journey.id };
  }
  async update(id: string, expectedVersion: number, patch: Partial<JourneyMilestoneSnapshot>) {
    const data: Prisma.JourneyMilestoneUpdateManyMutationInput = { ...(patch.status ? { status: patch.status } : {}), ...(patch.version ? { version: patch.version } : {}), ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}), ...(patch.blockerParty !== undefined ? { blockerParty: patch.blockerParty } : {}), ...(patch.blockerReason !== undefined ? { blockerReason: patch.blockerReason } : {}), ...(patch.expectedResolution !== undefined ? { expectedResolution: patch.expectedResolution } : {}), ...(patch.waiveReason !== undefined ? { waiveReason: patch.waiveReason } : {}), ...(patch.waivedBy !== undefined ? { waivedBy: patch.waivedBy } : {}), ...(patch.waivedAt !== undefined ? { waivedAt: patch.waivedAt } : {}), ...(patch.notApplicableReason !== undefined ? { notApplicableReason: patch.notApplicableReason } : {}), ...(patch.checklistData ? { checklistData: patch.checklistData as Prisma.InputJsonValue } : {}) };
    const result = await this.prisma.journeyMilestone.updateMany({ where: { id, version: expectedVersion }, data });
    if (result.count !== 1) return null;
    const row = await this.prisma.journeyMilestone.findUnique({ where: { id } });
    return row ? map(row as unknown as MilestoneRow) : null;
  }
  async appendHistory(transaction: unknown, input: { journeyId: string; milestoneId: string; fromStatus: string; toStatus: string; actorUserId: string; reason?: string; metadata?: Record<string, unknown> }) {
    const tx = transaction as Prisma.TransactionClient;
    await tx.journeyMilestoneHistory.create({ data: { journeyId: input.journeyId, milestoneId: input.milestoneId, fromStatus: input.fromStatus, toStatus: input.toStatus, actorUserId: input.actorUserId, reason: input.reason ?? null, metadata: (input.metadata ?? {}) as Prisma.InputJsonValue } });
  }
  async openAttempt(transaction: unknown, milestoneId: string, input: { attemptNo: number; reason: string; openedBy: string }) {
    const tx = transaction as Prisma.TransactionClient;
    await tx.journeyMilestoneAttempt.updateMany({ where: { milestoneId, status: 'OPEN' }, data: { status: 'SUPERSEDED', closedAt: new Date() } });
    const attempt = await tx.journeyMilestoneAttempt.create({ data: { milestoneId, attemptNo: input.attemptNo, reason: input.reason, openedBy: input.openedBy, status: 'OPEN' } });
    await tx.journeyMilestone.update({ where: { id: milestoneId }, data: { attemptNo: input.attemptNo, version: { increment: 1 } } });
    return { id: attempt.id, attemptNo: attempt.attemptNo, status: attempt.status };
  }
  async evidenceResult(milestoneId: string, evidenceIds: string[]): Promise<MilestoneEvidenceResult> {
    if (!evidenceIds.length) return { safe: false, count: 0, requiredCount: 1, ownerMatches: false };
    const count = await this.prisma.documentVersion.count({ where: { id: { in: evidenceIds }, status: 'SAFE', document: { links: { some: { milestoneId } } } } });
    return { safe: count === evidenceIds.length, count, requiredCount: evidenceIds.length, ownerMatches: count === evidenceIds.length };
  }
}
