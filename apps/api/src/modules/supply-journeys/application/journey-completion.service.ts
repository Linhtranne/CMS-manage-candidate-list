import { assertJourneyStatusTransition, SupplyJourneyDomainError, type SupplyJourneyEntity } from '../domain/supply-journey.aggregate.js';
import type { JourneyRepository, JourneyScopeContext } from './supply-journey.service.js';

export interface JourneyLifecycleEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string; metadata?: Record<string, unknown> }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string; payload: Record<string, unknown> }): Promise<void>;
}
export interface JourneyCompletionDependencies { blockingWorkComplete?(journeyId: string): Promise<boolean>; }

export class JourneyCompletionService {
  constructor(private readonly repository: JourneyRepository, private readonly dependencies: JourneyCompletionDependencies = {}, private readonly effects?: JourneyLifecycleEffects) {}
  async get(id: string, context: JourneyScopeContext): Promise<SupplyJourneyEntity> {
    const journey = await this.repository.findScoped(id, context);
    if (!journey) throw new SupplyJourneyDomainError('JOURNEY_NOT_FOUND', 404);
    return journey;
  }
  async hold(id: string, expectedVersion: number, reason: string, context: JourneyScopeContext): Promise<SupplyJourneyEntity> { return this.transition(id, expectedVersion, 'ON_HOLD', reason, context, 'SUPPLY_JOURNEY_HELD', 'supply_journey.held'); }
  async resume(id: string, expectedVersion: number, context: JourneyScopeContext): Promise<SupplyJourneyEntity> { return this.transition(id, expectedVersion, 'ACTIVE', undefined, context, 'SUPPLY_JOURNEY_RESUMED', 'supply_journey.resumed'); }
  async cancel(id: string, expectedVersion: number, reason: string, context: JourneyScopeContext): Promise<SupplyJourneyEntity> {
    if (!reason?.trim()) throw new SupplyJourneyDomainError('JOURNEY_CANCEL_REASON_REQUIRED');
    return this.transition(id, expectedVersion, 'CANCELLED', reason.trim(), context, 'SUPPLY_JOURNEY_CANCELLED', 'supply_journey.cancelled');
  }
  async complete(id: string, expectedVersion: number, context: JourneyScopeContext): Promise<SupplyJourneyEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findScoped(id, context);
      if (!current) throw new SupplyJourneyDomainError('JOURNEY_NOT_FOUND', 404);
      if (current.version !== expectedVersion) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      assertJourneyStatusTransition(current.status, 'COMPLETED');
      if (!current.milestones.every((milestone) => ['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status))) throw new SupplyJourneyDomainError('JOURNEY_MILESTONES_INCOMPLETE', 409);
      if (this.dependencies.blockingWorkComplete && !(await this.dependencies.blockingWorkComplete(id))) throw new SupplyJourneyDomainError('JOURNEY_BLOCKING_TASKS_OPEN', 409);
      const updated = await repository.updateStatus(id, expectedVersion, 'COMPLETED', { completedAt: new Date(), cancelReason: null });
      if (!updated) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      await this.effectsFor(transaction, context, updated, 'SUPPLY_JOURNEY_COMPLETED', 'supply_journey.completed');
      return updated;
    });
  }
  private async transition(id: string, expectedVersion: number, target: SupplyJourneyEntity['status'], reason: string | undefined, context: JourneyScopeContext, action: string, eventType: string): Promise<SupplyJourneyEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findScoped(id, context);
      if (!current) throw new SupplyJourneyDomainError('JOURNEY_NOT_FOUND', 404);
      if (current.version !== expectedVersion) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      assertJourneyStatusTransition(current.status, target);
      const updated = await repository.updateStatus(id, expectedVersion, target, { completedAt: null, cancelReason: target === 'CANCELLED' ? reason ?? null : null });
      if (!updated) throw new SupplyJourneyDomainError('VERSION_CONFLICT', 409);
      await this.effectsFor(transaction, context, updated, action, eventType, reason ? { reason } : undefined);
      return updated;
    });
  }
  private async effectsFor(transaction: unknown, context: JourneyScopeContext, journey: SupplyJourneyEntity, action: string, eventType: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: journey.id, actorUserId: context.actorId, correlationId: context.correlationId, metadata });
    await this.effects.outbox(transaction, { eventType, aggregateId: journey.id, correlationId: context.correlationId, payload: { journeyId: journey.id, status: journey.status, ...(metadata ?? {}) } });
  }
}
