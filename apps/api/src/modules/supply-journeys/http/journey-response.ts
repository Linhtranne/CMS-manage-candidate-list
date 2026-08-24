import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { SupplyJourneyEntity } from '../domain/supply-journey.aggregate.js';

type JourneyResponseOptions = { detail?: boolean };

function evidenceCount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((sum, item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return sum;
    const count = (item as { requiredCount?: unknown }).requiredCount;
    return sum + (typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : 0);
  }, 0);
}

export async function serializeJourney(prisma: PrismaService, journey: SupplyJourneyEntity, options: JourneyResponseOptions = {}): Promise<Record<string, unknown>> {
  const [application, templateVersion, owner] = await Promise.all([
    prisma.application.findUnique({ where: { id: journey.applicationId }, select: { candidate: { select: { id: true, code: true, name: true } }, jobOrder: { select: { id: true, code: true, position: true, client: { select: { id: true, name: true } } } } } }),
    prisma.supplyJourneyTemplateVersion.findUnique({ where: { id: journey.templateVersionId }, select: { id: true, templateId: true, version: true, template: { select: { name: true } } } }),
    prisma.user.findUnique({ where: { id: journey.ownerUserId }, select: { id: true, displayName: true } }),
  ]);

  const completed = journey.milestones.filter((milestone) => ['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status)).length;
  const blocked = journey.milestones.some((milestone) => milestone.status === 'BLOCKED');
  const nearest = journey.milestones.filter((milestone) => milestone.dueAt && !['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status)).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0]?.dueAt ?? null;
  const health = journey.status === 'COMPLETED' ? 'COMPLETED' : blocked ? 'AT_RISK' : nearest && nearest.getTime() < Date.now() ? 'OVERDUE' : 'ON_TRACK';
  const current = journey.milestones.find((milestone) => !['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status));
  const base = {
    id: journey.id,
    candidateId: journey.candidateId,
    applicationId: journey.applicationId,
    templateId: templateVersion?.templateId ?? journey.templateVersionId,
    templateVersion: `v${templateVersion?.version ?? 1}`,
    owner: { id: owner?.id ?? journey.ownerUserId, name: owner?.displayName ?? journey.ownerUserId },
    status: journey.status,
    startedAt: journey.startedAt.toISOString(),
    version: journey.version,
    candidate: { id: application?.candidate.id ?? journey.candidateId, code: application?.candidate.code ?? journey.candidateId, name: application?.candidate.name ?? journey.candidateId },
    order: { id: application?.jobOrder.id ?? 'unknown-order', code: application?.jobOrder.code ?? 'UNKNOWN', position: application?.jobOrder.position ?? '' },
    client: { id: application?.jobOrder.client.id ?? 'unknown-client', name: application?.jobOrder.client.name ?? 'Unknown client' },
    templateName: templateVersion?.template.name ?? journey.templateVersionId,
    currentMilestone: current?.code ?? 'COMPLETED',
    nearestDueAt: nearest?.toISOString() ?? null,
    progress: { completed, applicable: journey.milestones.length },
    health,
  };
  if (!options.detail) return base;
  const milestones = journey.milestones.map((milestone) => ({
    id: milestone.id ?? `${journey.id}:${milestone.code}`,
    journeyId: journey.id,
    code: milestone.code,
    name: milestone.name,
    sequence: milestone.sequence,
    status: milestone.status,
    dueAt: milestone.dueAt?.toISOString() ?? null,
    completedAt: milestone.completedAt?.toISOString() ?? null,
    owner: { id: milestone.ownerUserId, name: milestone.ownerUserId === owner?.id ? owner.displayName : milestone.ownerUserId },
    blockerParty: milestone.blockerParty,
    blockerReason: milestone.blockerReason,
    naReason: milestone.notApplicableReason,
    waiverReason: milestone.waiveReason,
    approver: null,
    evidenceIds: [],
    requiredEvidenceCount: evidenceCount(milestone.evidenceRequirement),
    completedEvidenceCount: 0,
    version: milestone.version,
  }));
  return { ...base, milestones, evidence: [], history: [], hasDeparturePlan: milestones.some((milestone) => milestone.code === 'DEPARTURE_PLAN'), departurePlan: null };
}
