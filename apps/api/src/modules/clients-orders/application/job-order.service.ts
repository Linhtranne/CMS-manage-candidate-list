import { assertJobOrderTransition, OrderDomainError, validateJobOrderDraft, validateRequirementSnapshot } from '../domain/job-order.rules.js';
import type { JobOrderEntity, JobOrderStatus, OrderCommandContext, RequirementSnapshot } from '../domain/order.types.js';
import { boundedLimit, encodeCursor } from '../domain/pagination.js';

export interface JobOrderRepository {
  withTransaction<T>(work: (repository: JobOrderRepository, transaction: unknown) => Promise<T>): Promise<T>;
  create(input: Omit<JobOrderEntity, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'metrics'>): Promise<JobOrderEntity>;
  findById(id: string): Promise<JobOrderEntity | null>;
  updateStatus(id: string, expectedVersion: number, status: JobOrderStatus): Promise<JobOrderEntity>;
  updateRequirement(id: string, expectedVersion: number, requirementVersion: number, requirementSnapshot: RequirementSnapshot): Promise<JobOrderEntity>;
  updateDetails?(id: string, expectedVersion: number, input: { position: string; industryLabel: string; occupation: string; location: string; target: number; deadline: Date; requirementVersion: number; requirementSnapshot: RequirementSnapshot }): Promise<JobOrderEntity>;
  findActiveOccupationCatalogVersion?(occupation: string): Promise<string | null>;
  list(filter?: { query?: string; status?: JobOrderStatus; industry?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number }): Promise<JobOrderEntity[]>;
  findClientStatus?(clientId: string): Promise<string | null>;
  findCatalogStatus?(catalogVersionId: string): Promise<string | null>;
  appendStatusHistory?(input: { jobOrderId: string; fromStatus: JobOrderStatus; toStatus: JobOrderStatus; actorUserId: string; reason?: string }): Promise<void>;
}

export interface JobOrderMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }): Promise<void>;
}

export class JobOrderService {
  constructor(private readonly repository: JobOrderRepository, private readonly effects?: JobOrderMutationEffects) {}

  async create(input: {
    code: string; position: string; clientId: string; industryLabel: string; occupation: string; location: string; target: number; deadline: Date;
    ownerId: string; teamId?: string | null; occupationCatalogVersionId: string; requirementSnapshot: unknown;
  }, context: OrderCommandContext): Promise<JobOrderEntity> {
    if (!input.code.trim() || input.position.trim().length < 2 || !input.clientId.trim() || !input.location.trim() || !input.ownerId.trim()) {
      throw new OrderDomainError('INVALID_ORDER_INPUT', 'errors.invalidOrderInput');
    }
    return this.repository.withTransaction(async (repository, transaction) => {
      const occupationCatalogVersionId = input.occupationCatalogVersionId.trim() || await repository.findActiveOccupationCatalogVersion?.(input.occupation) || '';
      const resolvedInput = { ...input, occupationCatalogVersionId };
      validateJobOrderDraft(resolvedInput);
      const snapshot = validateRequirementSnapshot({ ...((input.requirementSnapshot && typeof input.requirementSnapshot === 'object') ? input.requirementSnapshot : {}), catalogVersionId: occupationCatalogVersionId });
      const created = await repository.create({
        code: input.code.trim().toUpperCase(), position: input.position.trim(), clientId: input.clientId, industryLabel: input.industryLabel.trim(),
        occupation: input.occupation.trim().toUpperCase(), location: input.location.trim(), target: input.target, deadline: input.deadline,
        ownerId: input.ownerId, teamId: input.teamId ?? null, requirementVersion: 1, requirementCatalogVersionId: occupationCatalogVersionId,
        requirementSnapshot: snapshot,
      });
      await this.recordEffects(transaction, context, created, 'JOB_ORDER_CREATED', 'job_order.created');
      return created;
    });
  }

  async get(id: string): Promise<JobOrderEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new OrderDomainError('JOB_ORDER_NOT_FOUND', 'errors.jobOrderNotFound', 404);
    return entity;
  }

  async transition(id: string, target: JobOrderStatus, expectedVersion: number, context: OrderCommandContext, reason?: string): Promise<JobOrderEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findById(id);
      if (!current) throw new OrderDomainError('JOB_ORDER_NOT_FOUND', 'errors.jobOrderNotFound', 404);
      if (current.version !== expectedVersion) throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      assertJobOrderTransition(current.status, target, reason ?? context.reason);
      if (target === 'OPEN' && repository.findClientStatus) {
        const clientStatus = await repository.findClientStatus(current.clientId);
        if (clientStatus !== null && clientStatus !== 'ACTIVE') throw new OrderDomainError('CLIENT_NOT_ACTIVE', 'errors.clientNotActive', 422);
      }
      if (target === 'OPEN' && repository.findCatalogStatus) {
        const catalogStatus = await repository.findCatalogStatus(current.requirementCatalogVersionId);
        if (catalogStatus !== 'ACTIVE') throw new OrderDomainError('CATALOG_VERSION_NOT_ACTIVE', 'errors.catalogVersionNotActive', 422);
      }
      const updated = await repository.updateStatus(id, expectedVersion, target);
      if (repository.appendStatusHistory) await repository.appendStatusHistory({ jobOrderId: id, fromStatus: current.status, toStatus: target, actorUserId: context.actorId, reason: reason ?? context.reason });
      await this.recordEffects(transaction, context, updated, 'JOB_ORDER_STATUS_CHANGED', 'job_order.status_changed');
      if (target === 'OPEN') await this.recordEffects(transaction, context, updated, 'JOB_ORDER_OPENED', 'job_order.opened');
      return updated;
    });
  }

  async updateRequirement(id: string, requirementSnapshot: unknown, expectedVersion: number, context: OrderCommandContext): Promise<JobOrderEntity> {
    const snapshot = validateRequirementSnapshot(requirementSnapshot);
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findById(id);
      if (!current) throw new OrderDomainError('JOB_ORDER_NOT_FOUND', 'errors.jobOrderNotFound', 404);
      if (current.version !== expectedVersion) throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      if (current.status === 'CLOSED' || current.status === 'CANCELLED') throw new OrderDomainError('ORDER_NOT_OPEN_FOR_UPDATE', 'errors.orderNotOpenForUpdate', 409);
      if (repository.findCatalogStatus) {
        const catalogStatus = await repository.findCatalogStatus(snapshot.catalogVersionId);
        if (catalogStatus !== 'ACTIVE') throw new OrderDomainError('CATALOG_VERSION_NOT_ACTIVE', 'errors.catalogVersionNotActive', 422);
      }
      const updated = await repository.updateRequirement(id, expectedVersion, current.requirementVersion + 1, snapshot);
      await this.recordEffects(transaction, context, updated, 'JOB_ORDER_REQUIREMENT_UPDATED', 'job_order.requirement.updated');
      return updated;
    });
  }

  async updateDetails(id: string, input: { position: string; industryLabel: string; occupation: string; location: string; target: number; deadline: Date; occupationCatalogVersionId: string; requirementSnapshot: unknown }, expectedVersion: number, context: OrderCommandContext): Promise<JobOrderEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findById(id);
      if (!current) throw new OrderDomainError('JOB_ORDER_NOT_FOUND', 'errors.jobOrderNotFound', 404);
      if (current.version !== expectedVersion) throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      if (current.status === 'CLOSED' || current.status === 'CANCELLED') throw new OrderDomainError('ORDER_NOT_OPEN_FOR_UPDATE', 'errors.orderNotOpenForUpdate', 409);
      const occupationCatalogVersionId = input.occupationCatalogVersionId.trim();
      validateJobOrderDraft({ target: input.target, deadline: input.deadline, occupationCatalogVersionId });
      const snapshot = validateRequirementSnapshot({ ...(input.requirementSnapshot && typeof input.requirementSnapshot === 'object' ? input.requirementSnapshot : {}), catalogVersionId: occupationCatalogVersionId, occupation: input.occupation, criteria: (input.requirementSnapshot as { criteria?: unknown } | undefined)?.criteria ?? [] });
      if (repository.findCatalogStatus) {
        const catalogStatus = await repository.findCatalogStatus(snapshot.catalogVersionId);
        if (catalogStatus !== 'ACTIVE') throw new OrderDomainError('CATALOG_VERSION_NOT_ACTIVE', 'errors.catalogVersionNotActive', 422);
      }
      if (!repository.updateDetails) throw new OrderDomainError('ORDER_UPDATE_UNAVAILABLE', 'errors.orderUpdateUnavailable', 503);
      const updated = await repository.updateDetails(id, expectedVersion, {
        position: input.position.trim(), industryLabel: input.industryLabel.trim(), occupation: snapshot.occupation, location: input.location.trim(), target: input.target, deadline: input.deadline,
        requirementVersion: current.requirementVersion + 1, requirementSnapshot: snapshot,
      });
      await this.recordEffects(transaction, context, updated, 'JOB_ORDER_UPDATED', 'job_order.updated');
      await this.recordEffects(transaction, context, updated, 'JOB_ORDER_REQUIREMENT_UPDATED', 'job_order.requirement.updated');
      return updated;
    });
  }

  async list(filter: { query?: string; status?: JobOrderStatus; industry?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number } = {}): Promise<{ items: JobOrderEntity[]; page: { nextCursor: string | null; hasMore: boolean } }> {
    const limit = boundedLimit(filter.limit);
    const rows = await this.repository.list({ ...filter, limit: limit + 1 });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, page: { hasMore, nextCursor: hasMore && last ? encodeCursor({ sortValue: last.deadline.toISOString(), id: last.id }) : null } };
  }

  private async recordEffects(transaction: unknown, context: OrderCommandContext, entity: JobOrderEntity, action: string, eventType: string): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId });
  }
}
