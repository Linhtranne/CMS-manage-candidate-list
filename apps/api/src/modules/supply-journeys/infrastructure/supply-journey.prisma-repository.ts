import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { JourneyRepository, JourneyScopeContext } from '../application/supply-journey.service.js';
import type { JourneyContext } from '../domain/journey-template.js';
import { SupplyJourneyDomainError, type ApplicationJourneyContext, type JourneyMilestoneSnapshot, type SupplyJourneyEntity } from '../domain/supply-journey.aggregate.js';

type JourneyRow = {
  id: string; candidateId: string; applicationId: string; templateVersionId: string; templateChecksum: string; ownerUserId: string; teamId: string | null;
  status: string; contextSnapshot: Prisma.JsonValue; startedAt: Date; completedAt: Date | null; cancelReason: string | null; idempotencyKey: string; version: number; createdAt: Date; updatedAt: Date;
  milestones: Array<{ id: string; code: string; name: string; sequence: number; dependencyCodes: Prisma.JsonValue; status: string; ownerUserId: string; dueAt: Date | null; completedAt: Date | null; blockerParty: string | null; blockerReason: string | null; expectedResolution: string | null; waiveReason: string | null; waivedBy: string | null; waivedAt: Date | null; notApplicableReason: string | null; checklistData: Prisma.JsonValue; evidenceRequirement: Prisma.JsonValue; attemptNo: number; version: number }>;
};

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function jsonArray(value: Prisma.JsonValue): unknown[] { return Array.isArray(value) ? value : []; }

function mapMilestone(row: JourneyRow['milestones'][number]): JourneyMilestoneSnapshot {
  return { id: row.id, code: row.code, name: row.name, sequence: row.sequence, dependencyCodes: jsonArray(row.dependencyCodes).filter((entry): entry is string => typeof entry === 'string'), status: row.status as JourneyMilestoneSnapshot['status'], ownerUserId: row.ownerUserId, dueAt: row.dueAt, completedAt: row.completedAt, blockerParty: row.blockerParty, blockerReason: row.blockerReason, expectedResolution: row.expectedResolution, waiveReason: row.waiveReason, waivedBy: row.waivedBy, waivedAt: row.waivedAt, notApplicableReason: row.notApplicableReason, checklistData: jsonObject(row.checklistData), evidenceRequirement: jsonArray(row.evidenceRequirement), attemptNo: row.attemptNo, version: row.version };
}

function mapJourney(row: JourneyRow): SupplyJourneyEntity {
  return { id: row.id, candidateId: row.candidateId, applicationId: row.applicationId, templateVersionId: row.templateVersionId, templateChecksum: row.templateChecksum, ownerUserId: row.ownerUserId, teamId: row.teamId, status: row.status as SupplyJourneyEntity['status'], contextSnapshot: jsonObject(row.contextSnapshot) as unknown as JourneyContext, startedAt: row.startedAt, completedAt: row.completedAt, cancelReason: row.cancelReason, idempotencyKey: row.idempotencyKey, version: row.version, milestones: row.milestones.map(mapMilestone), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

function contextFromSnapshots(requirementSnapshot: Prisma.JsonValue, profileSnapshot: Prisma.JsonValue): JourneyContext {
  const requirement = jsonObject(requirementSnapshot);
  const profile = jsonObject(profileSnapshot);
  const value = { ...requirement, ...profile };
  const residenceContext = value.residenceContext;
  const caseType = value.caseType;
  if ((residenceContext !== 'OUTSIDE_JAPAN' && residenceContext !== 'IN_JAPAN') || (caseType !== 'NEW_ENTRY' && caseType !== 'JOB_CHANGE' && caseType !== 'STATUS_CHANGE' && caseType !== 'OTHER')) throw new SupplyJourneyDomainError('JOURNEY_CONTEXT_MISSING', 422);
  return { residenceContext, caseType, visaRouteVersionId: typeof value.visaRouteVersionId === 'string' ? value.visaRouteVersionId : null, sectorVersionId: typeof value.sectorVersionId === 'string' ? value.sectorVersionId : null, occupationVersionId: typeof value.occupationVersionId === 'string' ? value.occupationVersionId : null };
}

@Injectable()
export class SupplyJourneyPrismaRepository implements JourneyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: JourneyRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new SupplyJourneyPrismaRepository(transaction), transaction));
    return work(this, this.prisma);
  }

  async getApplicationContext(applicationId: string, context: JourneyScopeContext): Promise<ApplicationJourneyContext | null> {
    const scope = context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerId: context.actorId };
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, AND: [scope] }, select: { id: true, candidateId: true, ownerId: true, teamId: true, status: true, version: true, requirementSnapshot: true, profileSnapshot: true } });
    if (!application) return null;
    return { applicationId: application.id, candidateId: application.candidateId, ownerUserId: application.ownerId, teamId: application.teamId, status: application.status, version: application.version, context: contextFromSnapshots(application.requirementSnapshot, application.profileSnapshot) };
  }

  async findEffectiveByCandidate(candidateId: string): Promise<SupplyJourneyEntity | null> {
    const row = await this.prisma.supplyJourney.findFirst({ where: { candidateId, status: { in: ['ACTIVE', 'ON_HOLD'] } }, include: { milestones: { orderBy: { sequence: 'asc' } } } });
    return row ? mapJourney(row as unknown as JourneyRow) : null;
  }

  async findByIdempotency(idempotencyKey: string): Promise<SupplyJourneyEntity | null> {
    const row = await this.prisma.supplyJourney.findUnique({ where: { idempotencyKey }, include: { milestones: { orderBy: { sequence: 'asc' } } } });
    return row ? mapJourney(row as unknown as JourneyRow) : null;
  }

  async findScoped(id: string, context: JourneyScopeContext): Promise<SupplyJourneyEntity | null> {
    const where: Prisma.SupplyJourneyWhereInput = { id, ...(context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerUserId: context.actorId }) };
    const row = await this.prisma.supplyJourney.findFirst({ where, include: { milestones: { orderBy: { sequence: 'asc' } } } });
    return row ? mapJourney(row as unknown as JourneyRow) : null;
  }

  async updateStatus(id: string, expectedVersion: number, status: SupplyJourneyEntity['status'], patch: { completedAt?: Date | null; cancelReason?: string | null }): Promise<SupplyJourneyEntity | null> {
    const updated = await this.prisma.supplyJourney.updateMany({ where: { id, version: expectedVersion }, data: { status, version: { increment: 1 }, completedAt: patch.completedAt ?? null, cancelReason: patch.cancelReason ?? null } });
    if (updated.count !== 1) return null;
    const row = await this.prisma.supplyJourney.findUnique({ where: { id }, include: { milestones: { orderBy: { sequence: 'asc' } } } });
    return row ? mapJourney(row as unknown as JourneyRow) : null;
  }

  async list(context: JourneyScopeContext, filter: { status?: SupplyJourneyEntity['status']; ownerId?: string } = {}): Promise<SupplyJourneyEntity[]> {
    const scope: Prisma.SupplyJourneyWhereInput = context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerUserId: context.actorId };
    const rows = await this.prisma.supplyJourney.findMany({ where: { ...scope, ...(filter.status ? { status: filter.status } : {}), ...(filter.ownerId && context.scope === 'TEAM' ? { ownerUserId: filter.ownerId } : {}) }, include: { milestones: { orderBy: { sequence: 'asc' } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 101 });
    return rows.map((row) => mapJourney(row as unknown as JourneyRow));
  }

  async create(input: { application: ApplicationJourneyContext; template: { id: string; checksum: string }; ownerUserId: string; startedAt: Date; idempotencyKey: string; milestones: JourneyMilestoneSnapshot[] }): Promise<SupplyJourneyEntity> {
    const row = await this.prisma.supplyJourney.create({ data: { candidateId: input.application.candidateId, applicationId: input.application.applicationId, templateVersionId: input.template.id, templateChecksum: input.template.checksum, ownerUserId: input.ownerUserId, teamId: input.application.teamId, status: 'ACTIVE', contextSnapshot: input.application.context as unknown as Prisma.InputJsonValue, startedAt: input.startedAt, idempotencyKey: input.idempotencyKey, milestones: { create: input.milestones.map((milestone) => ({ code: milestone.code, name: milestone.name, sequence: milestone.sequence, dependencyCodes: milestone.dependencyCodes as Prisma.InputJsonValue, status: milestone.status, ownerUserId: milestone.ownerUserId, dueAt: milestone.dueAt, completedAt: milestone.completedAt, blockerParty: milestone.blockerParty, blockerReason: milestone.blockerReason, expectedResolution: milestone.expectedResolution, waiveReason: milestone.waiveReason, waivedBy: milestone.waivedBy, waivedAt: milestone.waivedAt, notApplicableReason: milestone.notApplicableReason, checklistData: milestone.checklistData as Prisma.InputJsonValue, evidenceRequirement: milestone.evidenceRequirement as Prisma.InputJsonValue, attemptNo: milestone.attemptNo, version: milestone.version })) } }, include: { milestones: { orderBy: { sequence: 'asc' } } } });
    return mapJourney(row as unknown as JourneyRow);
  }
}
