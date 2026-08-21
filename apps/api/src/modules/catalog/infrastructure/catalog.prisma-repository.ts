import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { CatalogRepository } from '../application/catalog.service.js';
import type { CatalogType } from '../domain/catalog.rules.js';
import type { CatalogVersionEntity } from '../domain/catalog.types.js';

type CatalogRow = {
  id: string;
  itemId: string;
  version: number;
  status: string;
  labelVi: string;
  payload: Prisma.JsonValue;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  item: { type: string; code: string };
};

function mapRow(row: CatalogRow): CatalogVersionEntity {
  return {
    id: row.id,
    itemId: row.itemId,
    type: row.item.type as CatalogType,
    code: row.item.code,
    version: row.version,
    status: row.status as CatalogVersionEntity['status'],
    labelVi: row.labelVi,
    payload: (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {}) as Record<string, unknown>,
    usageCount: row.usageCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CatalogPrismaRepository implements CatalogRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: CatalogRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      return this.prisma.$transaction(async (transaction) => work(new CatalogPrismaRepository(transaction), transaction));
    }
    return work(this, this.prisma);
  }

  async findItem(type: string, code: string) {
    return this.prisma.catalogItem.findUnique({ where: { type_code: { type, code } }, select: { id: true, type: true, code: true } });
  }

  async createItem(type: string, code: string) {
    return this.prisma.catalogItem.create({ data: { type, code }, select: { id: true, type: true, code: true } });
  }

  async nextVersion(itemId: string): Promise<number> {
    const latest = await this.prisma.catalogVersion.findFirst({ where: { itemId }, orderBy: { version: 'desc' }, select: { version: true } });
    return (latest?.version ?? 0) + 1;
  }

  async createVersion(input: Omit<CatalogVersionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogVersionEntity> {
    const row = await this.prisma.catalogVersion.create({
      data: {
        itemId: input.itemId,
        version: input.version,
        status: input.status,
        labelVi: input.labelVi,
        payload: input.payload as Prisma.InputJsonValue,
        usageCount: input.usageCount,
      },
      include: { item: { select: { type: true, code: true } } },
    });
    return mapRow(row);
  }

  async findVersion(id: string): Promise<CatalogVersionEntity | null> {
    const row = await this.prisma.catalogVersion.findUnique({ where: { id }, include: { item: { select: { type: true, code: true } } } });
    return row ? mapRow(row) : null;
  }

  async updateStatus(id: string, status: CatalogVersionEntity['status']): Promise<CatalogVersionEntity> {
    const row = await this.prisma.catalogVersion.update({
      where: { id },
      data: { status },
      include: { item: { select: { type: true, code: true } } },
    });
    return mapRow(row);
  }

  async listVersions(type?: string): Promise<CatalogVersionEntity[]> {
    const rows = await this.prisma.catalogVersion.findMany({
      where: type ? { item: { type } } : undefined,
      orderBy: [{ item: { type: 'asc' } }, { item: { code: 'asc' } }, { version: 'desc' }],
      include: { item: { select: { type: true, code: true } } },
    });
    return rows.map(mapRow);
  }
}
