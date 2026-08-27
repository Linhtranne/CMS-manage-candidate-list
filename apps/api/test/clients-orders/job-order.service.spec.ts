import { describe, expect, it } from 'vitest';
import { ClientService, type ClientRepository } from '../../src/modules/clients-orders/application/client.service.js';
import { JobOrderService, type JobOrderRepository } from '../../src/modules/clients-orders/application/job-order.service.js';
import type { ClientEntity, JobOrderEntity, RequirementSnapshot } from '../../src/modules/clients-orders/domain/order.types.js';

class InMemoryClientRepository implements ClientRepository {
  private sequence = 0;
  readonly clients = new Map<string, ClientEntity>();
  async withTransaction<T>(work: (repository: ClientRepository, transaction: unknown) => Promise<T>): Promise<T> { return work(this, { kind: 'client-tx' }); }
  async create(input: Omit<ClientEntity, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'activeOrders' | 'target' | 'passed' | 'lastActivity'>) {
    const now = new Date();
    const entity = { ...input, id: `client-${++this.sequence}`, version: 1, activeOrders: 0, target: 0, passed: 0, lastActivity: now, createdAt: now, updatedAt: now };
    this.clients.set(entity.id, entity);
    return entity;
  }
  async findById(id: string) { return this.clients.get(id) ?? null; }
  async update(id: string, expectedVersion: number, input: Partial<ClientEntity>) {
    const current = this.clients.get(id)!;
    if (current.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    const updated = { ...current, ...input, version: current.version + 1, updatedAt: new Date() };
    this.clients.set(id, updated);
    return updated;
  }
  async list() { return [...this.clients.values()]; }
}

class InMemoryJobOrderRepository implements JobOrderRepository {
  private sequence = 0;
  readonly orders = new Map<string, JobOrderEntity>();
  async withTransaction<T>(work: (repository: JobOrderRepository, transaction: unknown) => Promise<T>): Promise<T> { return work(this, { kind: 'order-tx' }); }
  async create(input: Omit<JobOrderEntity, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'metrics'>) {
    const now = new Date();
    const entity = { ...input, id: `order-${++this.sequence}`, version: 1, status: 'DRAFT' as const, metrics: { activeApplications: 0, passed: 0, supplied: 0 }, createdAt: now, updatedAt: now };
    this.orders.set(entity.id, entity);
    return entity;
  }
  async findById(id: string) { return this.orders.get(id) ?? null; }
  async updateStatus(id: string, expectedVersion: number, status: JobOrderEntity['status']) {
    const current = this.orders.get(id)!;
    if (current.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    const updated = { ...current, status, version: current.version + 1, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }
  async updateRequirement(id: string, expectedVersion: number, requirementVersion: number, requirementSnapshot: RequirementSnapshot) {
    const current = this.orders.get(id)!;
    if (current.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    const updated = { ...current, requirementVersion, requirementSnapshot, version: current.version + 1, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }
  async list() { return [...this.orders.values()]; }
}

const context = { actorId: 'u-1', requestId: 'req-1', correlationId: 'corr-1' };
const draft = { name: 'Acme Japan', organizationType: 'CORPORATION', industryLabels: ['IT'], region: 'Tokyo', ownerId: 'u-1', teamId: 'team-1', contact: { name: 'Nguyễn An', email: 'nguyen.an@example.com', phone: '+84901234567' } };

describe('client and job order services', () => {
  it('creates and updates clients with optimistic concurrency', async () => {
    const service = new ClientService(new InMemoryClientRepository());
    const client = await service.create(draft, context);
    expect(client).toMatchObject({ name: 'Acme Japan', version: 1, status: 'PROSPECT' });
    expect(client.contact).toMatchObject({ email: 'n******@example.com' });
    await expect(service.update(client.id, { name: 'Acme Updated' }, 2, context)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    const updated = await service.update(client.id, { name: 'Acme Updated' }, 1, context);
    expect(updated).toMatchObject({ name: 'Acme Updated', version: 2 });
  });

  it('snapshots requirements and enforces order version conflict/status transitions', async () => {
    const service = new JobOrderService(new InMemoryJobOrderRepository());
    const order = await service.create({
      code: 'JO-001', position: 'Backend Engineer', clientId: 'client-1', industryLabel: 'IT', occupation: 'ENGINEER', location: 'Tokyo', target: 2,
      deadline: new Date(Date.now() + 86_400_000), ownerId: 'u-1', teamId: 'team-1', occupationCatalogVersionId: 'catalog-1', requirementSnapshot: { catalogVersionId: 'catalog-1', occupation: 'ENGINEER', criteria: ['Japanese N2'] },
    }, context);
    expect(order.status).toBe('DRAFT');
    const opened = await service.transition(order.id, 'OPEN', 1, context, 'client approved');
    expect(opened).toMatchObject({ status: 'OPEN', version: 2 });
    const changed = await service.updateRequirement(order.id, { catalogVersionId: 'catalog-2', occupation: 'ENGINEER', criteria: ['Japanese N3'] }, 2, context);
    expect(changed).toMatchObject({ requirementVersion: 2, version: 3 });
    await expect(service.transition(order.id, 'ON_HOLD', 2, context, 'pause')).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
});
