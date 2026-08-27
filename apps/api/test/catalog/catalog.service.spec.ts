import { describe, expect, it } from 'vitest';
import { CatalogService, type CatalogRepository } from '../../src/modules/catalog/application/catalog.service.js';
import type { CatalogVersionEntity } from '../../src/modules/catalog/domain/catalog.types.js';

class InMemoryCatalogRepository implements CatalogRepository {
  private sequence = 0;
  private readonly items = new Map<string, { id: string; type: string; code: string }>();
  private readonly versions = new Map<string, CatalogVersionEntity>();

  async withTransaction<T>(work: (repository: CatalogRepository, transaction: unknown) => Promise<T>): Promise<T> {
    return work(this, { kind: 'test-transaction' });
  }

  async findItem(type: string, code: string) {
    return [...this.items.values()].find((item) => item.type === type && item.code === code) ?? null;
  }

  async createItem(type: string, code: string) {
    const item = { id: `item-${++this.sequence}`, type, code };
    this.items.set(item.id, item);
    return item;
  }

  async nextVersion(itemId: string) {
    return Math.max(0, ...[...this.versions.values()].filter((version) => version.itemId === itemId).map((version) => version.version)) + 1;
  }

  async createVersion(input: Omit<CatalogVersionEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const version = { ...input, id: `version-${++this.sequence}`, createdAt: now, updatedAt: now };
    this.versions.set(version.id, version);
    return version;
  }

  async findVersion(id: string) {
    return this.versions.get(id) ?? null;
  }

  async updateStatus(id: string, status: CatalogVersionEntity['status']) {
    const current = this.versions.get(id)!;
    const updated = { ...current, status, updatedAt: new Date() };
    this.versions.set(id, updated);
    return updated;
  }

  async listVersions(type?: string) {
    return [...this.versions.values()].filter((version) => !type || version.type === type);
  }
}

const context = { actorId: 'u-1', requestId: 'req-1', correlationId: 'corr-1' };
const approved = { decisionId: 'DEC-004' as const, artifactChecksum: `sha256:${'b'.repeat(64)}`, scope: 'test' };

describe('catalog service', () => {
  it('creates immutable draft versions and gates activation on DEC-004', async () => {
    const service = new CatalogService(new InMemoryCatalogRepository());
    const first = await service.createDraft({ type: 'industry', code: 'it', labelVi: 'Công nghệ thông tin' }, context);
    const second = await service.createDraft({ type: 'INDUSTRY', code: 'IT', labelVi: 'Công nghệ thông tin v2' }, context);

    expect(first).toMatchObject({ type: 'INDUSTRY', code: 'IT', version: 1, status: 'DRAFT' });
    expect(second).toMatchObject({ type: 'INDUSTRY', code: 'IT', version: 2, status: 'DRAFT' });
    await expect(service.activate(first.id, 1, context)).rejects.toMatchObject({ code: 'DECISION_REQUIRED' });

    const active = await service.activate(first.id, 1, { ...context, approval: approved });
    expect(active.status).toBe('ACTIVE');
    await expect(service.activate(first.id, 1, { ...context, approval: approved })).rejects.toMatchObject({ code: 'INVALID_CATALOG_STATUS_TRANSITION' });
  });

  it('requires the expected semantic version for retirement', async () => {
    const service = new CatalogService(new InMemoryCatalogRepository());
    const draft = await service.createDraft({ type: 'SOURCE', code: 'REFERRAL', labelVi: 'Giới thiệu' }, context);
    await service.activate(draft.id, draft.version, { ...context, approval: approved });
    await expect(service.retire(draft.id, 2, { ...context, approval: approved })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    const retired = await service.retire(draft.id, 1, { ...context, approval: approved });
    expect(retired.status).toBe('RETIRED');
  });

  it('writes audit and outbox effects inside every mutation transaction', async () => {
    const effects = {
      audit: async (transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }) => {
        expect(transaction).toMatchObject({ kind: 'test-transaction' });
        auditCalls.push(input.action);
      },
      outbox: async (transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }) => {
        expect(transaction).toMatchObject({ kind: 'test-transaction' });
        outboxCalls.push(input.eventType);
      },
    };
    const auditCalls: string[] = [];
    const outboxCalls: string[] = [];
    const service = new CatalogService(new InMemoryCatalogRepository(), effects);
    const draft = await service.createDraft({ type: 'VISA_ROUTE', code: 'ENGINEER', labelVi: 'Kỹ sư' }, context);
    await service.activate(draft.id, 1, { ...context, approval: approved });
    await service.retire(draft.id, 1, { ...context, approval: approved });

    expect(auditCalls).toEqual(['CATALOG_VERSION_CREATED', 'CATALOG_VERSION_ACTIVATED', 'CATALOG_VERSION_RETIRED']);
    expect(outboxCalls).toEqual(['catalog.version.created', 'catalog.version.activated', 'catalog.version.retired']);
  });
});
