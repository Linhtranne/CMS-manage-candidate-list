import { OrderDomainError, maskClientContact } from '../domain/job-order.rules.js';
import type { ClientContact, ClientEntity, ClientStatus, OrderCommandContext } from '../domain/order.types.js';
import { boundedLimit, encodeCursor } from '../domain/pagination.js';

export interface ClientRepository {
  withTransaction<T>(work: (repository: ClientRepository, transaction: unknown) => Promise<T>): Promise<T>;
  create(input: Omit<ClientEntity, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'activeOrders' | 'target' | 'passed' | 'lastActivity'>): Promise<ClientEntity>;
  findById(id: string): Promise<ClientEntity | null>;
  update(id: string, expectedVersion: number, input: Partial<ClientEntity>): Promise<ClientEntity>;
  list(filter?: { query?: string; status?: ClientStatus; ownerId?: string; teamId?: string; cursor?: string; limit?: number }): Promise<ClientEntity[]>;
}

export interface ClientMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }): Promise<void>;
}

function copyForResponse(entity: ClientEntity, revealContact = false): ClientEntity {
  return { ...entity, contact: entity.contact && !revealContact ? maskClientContact(entity.contact) : entity.contact };
}

function assertClientInput(input: { name: string; organizationType: string; industryLabels: string[]; region: string; ownerId: string }): void {
  if (input.name.trim().length < 2 || input.organizationType.trim().length < 2 || input.region.trim().length < 2 || !input.ownerId.trim()) {
    throw new OrderDomainError('INVALID_CLIENT_INPUT', 'errors.invalidClientInput');
  }
  if (!Array.isArray(input.industryLabels) || input.industryLabels.length === 0 || input.industryLabels.some((label) => !label.trim())) {
    throw new OrderDomainError('INVALID_CLIENT_INDUSTRIES', 'errors.invalidClientIndustries');
  }
}

export class ClientService {
  constructor(private readonly repository: ClientRepository, private readonly effects?: ClientMutationEffects) {}

  async create(input: { name: string; organizationType: string; industryLabels: string[]; region: string; ownerId: string; teamId?: string | null; contact?: ClientContact | null; notes?: string | null }, context: OrderCommandContext): Promise<ClientEntity> {
    assertClientInput(input);
    return this.repository.withTransaction(async (repository, transaction) => {
      const created = await repository.create({
        code: `CL-${randomUUID().slice(0, 12).toUpperCase()}`,
        name: input.name.trim(),
        organizationType: input.organizationType.trim(),
        industryLabels: input.industryLabels.map((label) => label.trim()),
        region: input.region.trim(),
        ownerId: input.ownerId,
        teamId: input.teamId ?? null,
        status: 'PROSPECT',
        contact: input.contact ?? null,
        notes: input.notes?.trim() || null,
      });
      await this.recordEffects(transaction, context, created, 'CLIENT_CREATED', 'client.created');
      return copyForResponse(created);
    });
  }

  async get(id: string, options: { revealContact?: boolean } = {}): Promise<ClientEntity> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new OrderDomainError('CLIENT_NOT_FOUND', 'errors.clientNotFound', 404);
    return copyForResponse(entity, options.revealContact === true);
  }

  async update(id: string, input: { name?: string; organizationType?: string; industryLabels?: string[]; region?: string; ownerId?: string; teamId?: string | null; contact?: ClientContact | null; notes?: string | null; status?: ClientStatus }, expectedVersion: number, context: OrderCommandContext): Promise<ClientEntity> {
    const current = await this.repository.findById(id);
    if (!current) throw new OrderDomainError('CLIENT_NOT_FOUND', 'errors.clientNotFound', 404);
    if (current.version !== expectedVersion) throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
    assertClientInput({
      name: input.name ?? current.name,
      organizationType: input.organizationType ?? current.organizationType,
      industryLabels: input.industryLabels ?? current.industryLabels,
      region: input.region ?? current.region,
      ownerId: input.ownerId ?? current.ownerId,
    });
    return this.repository.withTransaction(async (repository, transaction) => {
      const updated = await repository.update(id, expectedVersion, {
        ...input,
        name: input.name?.trim(),
        organizationType: input.organizationType?.trim(),
        industryLabels: input.industryLabels?.map((label) => label.trim()),
        region: input.region?.trim(),
        notes: input.notes?.trim() || null,
      });
      await this.recordEffects(transaction, context, updated, 'CLIENT_UPDATED', 'client.updated');
      return copyForResponse(updated);
    });
  }

  async list(filter: { query?: string; status?: ClientStatus; ownerId?: string; teamId?: string; cursor?: string; limit?: number } = {}): Promise<{ items: ClientEntity[]; page: { nextCursor: string | null; hasMore: boolean } }> {
    const limit = boundedLimit(filter.limit);
    const rows = await this.repository.list({ ...filter, limit: limit + 1 });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((entity) => copyForResponse(entity));
    const last = items.at(-1);
    return { items, page: { hasMore, nextCursor: hasMore && last ? encodeCursor({ sortValue: last.updatedAt.toISOString(), id: last.id }) : null } };
  }

  private async recordEffects(transaction: unknown, context: OrderCommandContext, entity: ClientEntity, action: string, eventType: string): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId });
  }
}
import { randomUUID } from 'node:crypto';
