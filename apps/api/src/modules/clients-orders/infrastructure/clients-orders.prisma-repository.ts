import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { ClientRepository } from '../application/client.service.js';
import type { JobOrderRepository } from '../application/job-order.service.js';
import type { ClientEntity, ClientStatus, JobOrderEntity, JobOrderStatus, RequirementSnapshot } from '../domain/order.types.js';
import { OrderDomainError } from '../domain/job-order.rules.js';
import { decodeCursor } from '../domain/pagination.js';

type PrismaHandle = PrismaService | Prisma.TransactionClient;

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapClient(row: {
  id: string; code: string; name: string; organizationType: string; industryLabels: Prisma.JsonValue; region: string; ownerId: string; teamId: string | null;
  status: string; notes: string | null; version: number; createdAt: Date; updatedAt: Date; contact?: { name: string; email: string | null; phone: string | null } | null;
  owner?: { displayName: string };
}): ClientEntity {
  return {
    id: row.id, code: row.code, name: row.name, organizationType: row.organizationType, industryLabels: jsonArray(row.industryLabels), region: row.region,
    ownerId: row.ownerId, ownerName: row.owner?.displayName, teamId: row.teamId, status: row.status as ClientStatus,
    contact: row.contact ? { name: row.contact.name, ...(row.contact.email ? { email: row.contact.email } : {}), ...(row.contact.phone ? { phone: row.contact.phone } : {}) } : null,
    notes: row.notes, activeOrders: 0, target: 0, passed: 0, lastActivity: row.updatedAt, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function mapOrder(row: {
  id: string; code: string; position: string; clientId: string; industryLabel: string; occupation: string; location: string; target: number; deadline: Date;
  ownerId: string; teamId: string | null; status: string; requirementVersion: number; requirementCatalogVersionId: string; requirementSnapshot: Prisma.JsonValue;
  activeApplications: number; passedApplications: number; suppliedApplications: number; version: number; createdAt: Date; updatedAt: Date;
  owner?: { displayName: string }; client?: { name: string };
}): JobOrderEntity {
  return {
    id: row.id, code: row.code, position: row.position, clientId: row.clientId, industryLabel: row.industryLabel, occupation: row.occupation, location: row.location,
    target: row.target, deadline: row.deadline, ownerId: row.ownerId, ownerName: row.owner?.displayName, clientName: row.client?.name, teamId: row.teamId, status: row.status as JobOrderStatus,
    requirementVersion: row.requirementVersion, requirementCatalogVersionId: row.requirementCatalogVersionId, requirementSnapshot: jsonObject(row.requirementSnapshot) as RequirementSnapshot,
    metrics: { activeApplications: row.activeApplications, passed: row.passedApplications, supplied: row.suppliedApplications }, version: row.version,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ClientsOrdersPrismaRepository implements ClientRepository, JobOrderRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaHandle) {}

  async withTransaction<T>(work: (repository: ClientsOrdersPrismaRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new ClientsOrdersPrismaRepository(transaction), transaction));
    return work(this, this.prisma);
  }

  async create(input: Parameters<ClientRepository['create']>[0]): Promise<ClientEntity>;
  async create(input: Parameters<JobOrderRepository['create']>[0]): Promise<JobOrderEntity>;
  async create(input: Parameters<ClientRepository['create']>[0] | Parameters<JobOrderRepository['create']>[0]): Promise<ClientEntity | JobOrderEntity> {
    if ('organizationType' in input) {
      const row = await this.prisma.client.create({
        data: {
          code: input.code, name: input.name, organizationType: input.organizationType, industryLabels: input.industryLabels as Prisma.InputJsonValue,
          region: input.region, ownerId: input.ownerId, teamId: input.teamId, status: input.status, notes: input.notes,
          ...(input.contact ? { contact: { create: { name: input.contact.name, email: input.contact.email, phone: input.contact.phone } } } : {}),
        },
        include: { contact: true, owner: { select: { displayName: true } } },
      });
      return mapClient(row);
    }
    const row = await this.prisma.jobOrder.create({
      data: {
        code: input.code, position: input.position, clientId: input.clientId, industryLabel: input.industryLabel, occupation: input.occupation, location: input.location,
        target: input.target, deadline: input.deadline, ownerId: input.ownerId, teamId: input.teamId, requirementVersion: input.requirementVersion,
        requirementCatalogVersionId: input.requirementCatalogVersionId, requirementSnapshot: input.requirementSnapshot as Prisma.InputJsonValue,
        requirements: { create: { version: input.requirementVersion, catalogVersionId: input.requirementCatalogVersionId, snapshot: input.requirementSnapshot as Prisma.InputJsonValue } },
      }, include: { owner: { select: { displayName: true } }, client: { select: { name: true } } },
    });
    return mapOrder(row);
  }

  async findById(id: string): Promise<ClientEntity | null>;
  async findById(id: string): Promise<JobOrderEntity | null>;
  async findById(id: string): Promise<ClientEntity | JobOrderEntity | null> {
    const client = await this.prisma.client.findUnique({ where: { id }, include: { contact: true, owner: { select: { displayName: true } } } });
    if (client) return mapClient(client);
    const order = await this.prisma.jobOrder.findUnique({ where: { id }, include: { owner: { select: { displayName: true } }, client: { select: { name: true } } } });
    return order ? mapOrder(order) : null;
  }

  async update(id: string, expectedVersion: number, input: Partial<ClientEntity>): Promise<ClientEntity> {
    try {
      const row = await this.prisma.client.update({
      where: { id, version: expectedVersion },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}), ...(input.organizationType !== undefined ? { organizationType: input.organizationType } : {}),
        ...(input.industryLabels !== undefined ? { industryLabels: input.industryLabels as Prisma.InputJsonValue } : {}), ...(input.region !== undefined ? { region: input.region } : {}),
        ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}), ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), version: { increment: 1 },
        ...(input.contact ? { contact: { upsert: { create: { name: input.contact.name, email: input.contact.email, phone: input.contact.phone }, update: { name: input.contact.name, email: input.contact.email, phone: input.contact.phone } } } } : {}),
      },
      include: { contact: true, owner: { select: { displayName: true } } },
      });
      return mapClient(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      throw error;
    }
  }

  async updateStatus(id: string, expectedVersion: number, status: JobOrderStatus): Promise<JobOrderEntity> {
    try {
      const row = await this.prisma.jobOrder.update({ where: { id, version: expectedVersion }, data: { status, version: { increment: 1 } }, include: { owner: { select: { displayName: true } }, client: { select: { name: true } } } });
      return mapOrder(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      throw error;
    }
  }

  async updateRequirement(id: string, expectedVersion: number, requirementVersion: number, requirementSnapshot: RequirementSnapshot): Promise<JobOrderEntity> {
    try {
      const row = await this.prisma.jobOrder.update({
      where: { id, version: expectedVersion },
      data: {
        requirementVersion, requirementCatalogVersionId: requirementSnapshot.catalogVersionId, requirementSnapshot: requirementSnapshot as Prisma.InputJsonValue,
        version: { increment: 1 },
        requirements: { create: { version: requirementVersion, catalogVersionId: requirementSnapshot.catalogVersionId, snapshot: requirementSnapshot as Prisma.InputJsonValue } },
      },
      include: { owner: { select: { displayName: true } }, client: { select: { name: true } } },
      });
      return mapOrder(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new OrderDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      throw error;
    }
  }

  async findClientStatus(clientId: string): Promise<string | null> {
    const row = await this.prisma.client.findUnique({ where: { id: clientId }, select: { status: true } });
    return row?.status ?? null;
  }

  async findCatalogStatus(catalogVersionId: string): Promise<string | null> {
    const row = await this.prisma.catalogVersion.findUnique({ where: { id: catalogVersionId }, select: { status: true } });
    return row?.status ?? null;
  }

  async appendStatusHistory(input: { jobOrderId: string; fromStatus: JobOrderStatus; toStatus: JobOrderStatus; actorUserId: string; reason?: string }): Promise<void> {
    await this.prisma.jobOrderStatusHistory.create({ data: { jobOrderId: input.jobOrderId, fromStatus: input.fromStatus, toStatus: input.toStatus, actorUserId: input.actorUserId, reason: input.reason } });
  }

  async list(filter: { query?: string; status?: ClientStatus; industry?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number }): Promise<ClientEntity[]>;
  async list(filter: { query?: string; status?: JobOrderStatus; industry?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number }): Promise<JobOrderEntity[]>;
  async list(filter: { query?: string; status?: string; industry?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number } = {}): Promise<ClientEntity[] | JobOrderEntity[]> {
    const scopeFilters: Prisma.JobOrderWhereInput[] = [];
    if (filter.ownerId) scopeFilters.push({ ownerId: filter.ownerId });
    if (filter.teamId) scopeFilters.push({ teamId: filter.teamId });
    if ('industry' in filter) {
      const cursor = decodeCursor(filter.cursor);
      const rows = await this.prisma.jobOrder.findMany({
        where: {
          ...(filter.status ? { status: filter.status } : {}), ...(filter.industry ? { industryLabel: filter.industry } : {}),
          AND: [
            ...(scopeFilters.length ? [{ OR: scopeFilters }] : []),
            ...(filter.query ? [{ OR: [{ code: { contains: filter.query, mode: 'insensitive' as const } }, { position: { contains: filter.query, mode: 'insensitive' as const } }] }] : []),
            ...(cursor ? [{ OR: [{ deadline: { gt: new Date(cursor.sortValue) } }, { deadline: new Date(cursor.sortValue), id: { gt: cursor.id } }] }] : []),
          ],
        }, orderBy: [{ deadline: 'asc' }, { id: 'asc' }], take: filter.limit, include: { owner: { select: { displayName: true } }, client: { select: { name: true } } },
      });
      return rows.map(mapOrder);
    }
    const clientScopeFilters: Prisma.ClientWhereInput[] = [];
    if (filter.ownerId) clientScopeFilters.push({ ownerId: filter.ownerId });
    if (filter.teamId) clientScopeFilters.push({ teamId: filter.teamId });
    const cursor = decodeCursor(filter.cursor);
    const rows = await this.prisma.client.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        AND: [
          ...(clientScopeFilters.length ? [{ OR: clientScopeFilters }] : []),
          ...(filter.query ? [{ OR: [{ code: { contains: filter.query, mode: 'insensitive' as const } }, { name: { contains: filter.query, mode: 'insensitive' as const } }] }] : []),
          ...(cursor ? [{ OR: [{ updatedAt: { lt: new Date(cursor.sortValue) } }, { updatedAt: new Date(cursor.sortValue), id: { gt: cursor.id } }] }] : []),
        ],
      }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: filter.limit, include: { contact: true, owner: { select: { displayName: true } } },
    });
    return rows.map(mapClient);
  }
}
