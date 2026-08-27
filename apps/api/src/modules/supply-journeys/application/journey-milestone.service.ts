import { assertEvidenceComplete, assertMilestoneTransition, dependenciesSatisfied, type MilestoneEvidenceResult, type MilestoneTransitionInput } from '../domain/journey-milestone.aggregate.js';
import { SupplyJourneyDomainError, type JourneyMilestoneSnapshot } from '../domain/supply-journey.aggregate.js';
import type { JourneyScopeContext } from './supply-journey.service.js';

export interface MilestoneRepository {
  withTransaction<T>(work: (repository: MilestoneRepository, transaction: unknown) => Promise<T>): Promise<T>;
  findScoped(id: string, context: JourneyScopeContext): Promise<{ milestone: JourneyMilestoneSnapshot; all: JourneyMilestoneSnapshot[]; journeyId: string } | null>;
  update(id: string, expectedVersion: number, patch: Partial<JourneyMilestoneSnapshot>): Promise<JourneyMilestoneSnapshot | null>;
  appendHistory(transaction: unknown, input: { journeyId: string; milestoneId: string; fromStatus: string; toStatus: string; actorUserId: string; reason?: string; metadata?: Record<string, unknown> }): Promise<void>;
  openAttempt(transaction: unknown, milestoneId: string, input: { attemptNo: number; reason: string; openedBy: string }): Promise<{ id: string; attemptNo: number; status: string }>;
  evidenceResult?(milestoneId: string, evidenceIds: string[]): Promise<MilestoneEvidenceResult>;
}

export interface MilestoneMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string; metadata?: Record<string, unknown> }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string; payload: Record<string, unknown> }): Promise<void>;
}

export interface MilestoneCommandContext extends JourneyScopeContext {
  canWaive?: boolean;
  canReopen?: boolean;
  approvalId?: string;
}

export class JourneyMilestoneService {
  constructor(private readonly repository: MilestoneRepository, private readonly evidence?: (milestone: JourneyMilestoneSnapshot, input: MilestoneTransitionInput, context: MilestoneCommandContext) => Promise<MilestoneEvidenceResult>, private readonly effects?: MilestoneMutationEffects) {}

  async start(id: string, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'IN_PROGRESS', {}, context, 'MILESTONE_STARTED', 'journey.milestone.started');
  }

  async get(id: string, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    const found = await this.repository.findScoped(id, context);
    if (!found) throw new SupplyJourneyDomainError('MILESTONE_NOT_FOUND', 404);
    return found.milestone;
  }

  async block(id: string, input: MilestoneTransitionInput, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'BLOCKED', input, context, 'MILESTONE_BLOCKED', 'journey.milestone.blocked');
  }

  async complete(id: string, input: MilestoneTransitionInput, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'COMPLETED', input, context, 'MILESTONE_COMPLETED', 'journey.milestone.completed');
  }

  async waive(id: string, input: MilestoneTransitionInput, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'WAIVED', input, context, 'MILESTONE_WAIVED', 'journey.milestone.waived');
  }

  async markNotApplicable(id: string, input: MilestoneTransitionInput, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'NOT_APPLICABLE', input, context, 'MILESTONE_NOT_APPLICABLE', 'journey.milestone.not_applicable');
  }

  async reopen(id: string, input: MilestoneTransitionInput, expectedVersion: number, context: MilestoneCommandContext): Promise<JourneyMilestoneSnapshot> {
    return this.transition(id, expectedVersion, 'IN_PROGRESS', input, context, 'MILESTONE_REOPENED', 'journey.milestone.reopened');
  }

  async openAttempt(id: string, reason: string, context: MilestoneCommandContext): Promise<{ id: string; attemptNo: number; status: string }> {
    if (!reason.trim()) throw new SupplyJourneyDomainError('MILESTONE_ATTEMPT_REASON_REQUIRED');
    return this.repository.withTransaction(async (repository, transaction) => {
      const found = await repository.findScoped(id, context);
      if (!found) throw new SupplyJourneyDomainError('MILESTONE_NOT_FOUND', 404);
      const attempt = await repository.openAttempt(transaction, id, { attemptNo: found.milestone.attemptNo + 1, reason: reason.trim(), openedBy: context.actorId });
      await this.recordEffects(transaction, context, id, 'MILESTONE_ATTEMPT_OPENED', 'journey.milestone.attempt_opened', { attemptNo: attempt.attemptNo });
      return attempt;
    });
  }

  private async transition(id: string, expectedVersion: number, target: JourneyMilestoneSnapshot['status'], input: MilestoneTransitionInput, context: MilestoneCommandContext, action: string, eventType: string): Promise<JourneyMilestoneSnapshot> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const found = await repository.findScoped(id, context);
      if (!found) throw new SupplyJourneyDomainError('MILESTONE_NOT_FOUND', 404);
      if (found.milestone.version !== expectedVersion) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      assertMilestoneTransition(found.milestone.status, target, input, context);
      if (['IN_PROGRESS', 'COMPLETED'].includes(target) && !dependenciesSatisfied(found.milestone, found.all)) throw new SupplyJourneyDomainError('MILESTONE_DEPENDENCY_UNMET', 409);
      if (target === 'COMPLETED') {
        const requiredCount: number = found.milestone.evidenceRequirement.reduce<number>((total, entry) => total + (entry && typeof entry === 'object' && 'requiredCount' in entry && typeof (entry as { requiredCount?: unknown }).requiredCount === 'number' ? Number((entry as { requiredCount: number }).requiredCount) : 1), 0);
        const evidenceResult = this.evidence ? await this.evidence(found.milestone, input, context) : this.repository.evidenceResult ? await this.repository.evidenceResult(id, input.evidenceIds ?? []) : { safe: (input.evidenceIds?.length ?? 0) >= requiredCount, count: input.evidenceIds?.length ?? 0, requiredCount, ownerMatches: true };
        assertEvidenceComplete(evidenceResult);
      }
      const patch: Partial<JourneyMilestoneSnapshot> = {
        status: target,
        version: found.milestone.version + 1,
        ...(target === 'BLOCKED' ? { blockerParty: input.blockerParty ?? null, blockerReason: input.blockerReason?.trim() ?? null, expectedResolution: input.expectedResolution?.trim() ?? null } : {}),
        ...(target === 'COMPLETED' ? { completedAt: new Date(), checklistData: input.checklistData ?? found.milestone.checklistData } : {}),
        ...(target === 'WAIVED' ? { waiveReason: input.reason?.trim() ?? null, waivedBy: input.approverId ?? context.actorId, waivedAt: new Date() } : {}),
        ...(target === 'NOT_APPLICABLE' ? { notApplicableReason: input.reason?.trim() ?? null } : {}),
        ...(target === 'IN_PROGRESS' && found.milestone.status === 'COMPLETED' ? { completedAt: null } : {}),
      };
      const updated = await repository.update(id, expectedVersion, patch);
      if (!updated) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      await repository.appendHistory(transaction, { journeyId: found.journeyId, milestoneId: id, fromStatus: found.milestone.status, toStatus: target, actorUserId: context.actorId, reason: input.reason, metadata: { evidenceIds: input.evidenceIds ?? [] } });
      await this.recordEffects(transaction, context, id, action, eventType, { fromStatus: found.milestone.status, toStatus: target });
      return updated;
    });
  }

  private async recordEffects(transaction: unknown, context: MilestoneCommandContext, entityId: string, action: string, eventType: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId, actorUserId: context.actorId, correlationId: context.correlationId, metadata });
    await this.effects.outbox(transaction, { eventType, aggregateId: entityId, correlationId: context.correlationId, payload: { milestoneId: entityId, ...metadata } });
  }
}
