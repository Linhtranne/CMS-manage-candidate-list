import { validateCatalogDraft, assertCatalogTransition, CatalogDomainError } from '../domain/catalog.rules.js';
import type { CatalogApproval, CatalogCommandContext, CatalogVersionEntity } from '../domain/catalog.types.js';

export interface CatalogRepository {
  withTransaction<T>(work: (repository: CatalogRepository, transaction: unknown) => Promise<T>): Promise<T>;
  findItem(type: string, code: string): Promise<{ id: string; type: string; code: string } | null>;
  createItem(type: string, code: string): Promise<{ id: string; type: string; code: string }>;
  nextVersion(itemId: string): Promise<number>;
  createVersion(input: Omit<CatalogVersionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogVersionEntity>;
  findVersion(id: string): Promise<CatalogVersionEntity | null>;
  updateStatus(id: string, status: CatalogVersionEntity['status']): Promise<CatalogVersionEntity>;
  listVersions(type?: string): Promise<CatalogVersionEntity[]>;
}

export interface CatalogMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }): Promise<void>;
}

function assertApproval(approval: CatalogApproval | undefined): void {
  if (!approval || approval.decisionId !== 'DEC-004' || !/^sha256:[0-9a-f]{64}$/i.test(approval.artifactChecksum) || !approval.scope.trim()) {
    throw new CatalogDomainError('DECISION_REQUIRED', 'errors.catalogDecisionRequired', 403);
  }
}

function missingVersion(): never {
  throw new CatalogDomainError('CATALOG_VERSION_NOT_FOUND', 'errors.catalogVersionNotFound', 404);
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository, private readonly effects?: CatalogMutationEffects) {}

  async createDraft(input: { type: string; code: string; labelVi: string }, _context: CatalogCommandContext): Promise<CatalogVersionEntity> {
    const draft = validateCatalogDraft(input);
    return this.repository.withTransaction(async (repository, transaction) => {
      const item = await repository.findItem(draft.type, draft.code) ?? await repository.createItem(draft.type, draft.code);
      const version = await repository.nextVersion(item.id);
      const created = await repository.createVersion({
        itemId: item.id,
        type: draft.type,
        code: draft.code,
        version,
        status: 'DRAFT',
        labelVi: draft.labelVi,
        payload: {},
        usageCount: 0,
      });
      await this.recordEffects(transaction, _context, created, 'CATALOG_VERSION_CREATED', 'catalog.version.created');
      return created;
    });
  }

  async activate(id: string, expectedVersion: number, context: CatalogCommandContext): Promise<CatalogVersionEntity> {
    assertApproval(context.approval);
    return this.transition(id, expectedVersion, 'ACTIVE', context, 'CATALOG_VERSION_ACTIVATED', 'catalog.version.activated');
  }

  async retire(id: string, expectedVersion: number, context: CatalogCommandContext): Promise<CatalogVersionEntity> {
    assertApproval(context.approval);
    return this.transition(id, expectedVersion, 'RETIRED', context, 'CATALOG_VERSION_RETIRED', 'catalog.version.retired');
  }

  async list(type?: string): Promise<CatalogVersionEntity[]> {
    return this.repository.listVersions(type);
  }

  private async transition(
    id: string,
    expectedVersion: number,
    target: CatalogVersionEntity['status'],
    context: CatalogCommandContext,
    action: string,
    eventType: string,
  ): Promise<CatalogVersionEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findVersion(id);
      if (!current) missingVersion();
      if (current.version !== expectedVersion) {
        throw new CatalogDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      }
      assertCatalogTransition(current.status, target);
      const updated = await repository.updateStatus(id, target);
      await this.recordEffects(transaction, context, updated, action, eventType);
      return updated;
    });
  }

  private async recordEffects(transaction: unknown, context: CatalogCommandContext, entity: CatalogVersionEntity, action: string, eventType: string): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId });
  }
}
