import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { decryptCandidateValue } from './candidate.crypto.js';
import { decodeCandidateCursor, candidateLimit } from '../domain/pagination.js';
import type { CandidateRepository } from '../application/candidate.service.js';
import type { CandidateEntity, CandidateListQuery, CandidateMatchEntity, OccupationProfileEntity } from '../domain/candidate.types.js';

type CandidateClient = PrismaService | Prisma.TransactionClient;
type CandidateRow = Prisma.CandidateGetPayload<{ include: { owner: { select: { displayName: true } }; profiles: true } }>;
type ProfileRow = Prisma.CandidateOccupationProfileGetPayload<object>;

function jsonArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

@Injectable()
export class CandidatePrismaRepository implements CandidateRepository {
  private readonly secret: string;

  constructor(@Inject(PrismaService) private readonly prisma: CandidateClient, @Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.secret = config.security.encryptionKey;
  }

  private constructorForTransaction(transaction: Prisma.TransactionClient): CandidatePrismaRepository {
    return Object.assign(Object.create(CandidatePrismaRepository.prototype), { prisma: transaction, secret: this.secret }) as CandidatePrismaRepository;
  }

  async withTransaction<T>(work: (repository: CandidateRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(this.constructorForTransaction(transaction), transaction));
    return work(this, this.prisma);
  }

  async findById(id: string): Promise<CandidateEntity | null> {
    const row = await this.prisma.candidate.findUnique({ where: { id }, include: { owner: { select: { displayName: true } }, profiles: true } });
    return row ? this.map(row) : null;
  }

  async findDuplicateByBlindIndex(kind: 'passport' | 'email' | 'phone', blindIndex: string): Promise<CandidateEntity | null> {
    const field = kind === 'passport' ? 'passportBlindIndex' : kind === 'email' ? 'emailBlindIndex' : 'phoneBlindIndex';
    const row = await this.prisma.candidate.findFirst({ where: { [field]: blindIndex }, include: { owner: { select: { displayName: true } }, profiles: true } });
    return row ? this.map(row) : null;
  }

  async create(input: Parameters<CandidateRepository['create']>[0]): Promise<CandidateEntity> {
    const row = await this.prisma.candidate.create({
      data: {
        code: `CA-${randomUUID().slice(0, 12).toUpperCase()}`,
        name: input.name,
        normalizedName: input.normalizedName,
        industryLabels: input.industryLabels,
        occupation: input.occupation,
        japaneseLevel: input.japaneseLevel,
        source: input.source,
        readinessStatus: input.readinessStatus,
        contactabilityStatus: input.contactabilityStatus,
        recordStatus: input.recordStatus,
        ownerId: input.ownerId,
        teamId: input.teamId,
        emailCiphertext: input.emailCiphertext,
        emailBlindIndex: input.emailBlindIndex,
        phoneCiphertext: input.phoneCiphertext,
        phoneBlindIndex: input.phoneBlindIndex,
        addressCiphertext: input.addressCiphertext,
        passportCiphertext: input.passportCiphertext,
        passportBlindIndex: input.passportBlindIndex,
      },
      include: { owner: { select: { displayName: true } }, profiles: true },
    });
    return this.map(row);
  }

  async update(id: string, expectedVersion: number, input: Record<string, unknown>): Promise<CandidateEntity | null> {
    const result = await this.prisma.candidate.updateMany({ where: { id, version: expectedVersion }, data: { ...input, version: { increment: 1 } } });
    if (result.count !== 1) return null;
    return this.findById(id);
  }

  async list(query: CandidateListQuery): Promise<{ items: CandidateEntity[]; hasMore: boolean }> {
    const limit = candidateLimit(query.limit);
    const cursor = decodeCandidateCursor(query.cursor);
    const where: Prisma.CandidateWhereInput = {};
    if (query.scope === 'SELF') {
      if (query.ownerId) where.ownerId = query.ownerId;
      else where.id = '__DENY_ALL__';
    }
    if (query.scope === 'TEAM') {
      if (query.teamId) where.teamId = query.teamId;
      else where.id = '__DENY_ALL__';
    }
    if (query.query?.trim()) {
      const term = query.query.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { normalizedName: { contains: term.toLocaleLowerCase(), mode: 'insensitive' } },
        { occupation: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (query.readinessStatus) where.readinessStatus = query.readinessStatus;
    if (query.japaneseLevel) where.japaneseLevel = query.japaneseLevel;
    if (query.contactabilityStatus) where.contactabilityStatus = query.contactabilityStatus;
    if (query.recordStatus) where.recordStatus = query.recordStatus;
    if (query.source) where.source = query.source;
    if (query.view === 'archived') where.recordStatus = 'ARCHIVED';
    if (query.view === 'potential') where.readinessStatus = 'POTENTIAL';
    if (query.view === 'ready-to-match') where.readinessStatus = 'READY';
    if (query.view === 'paused') where.readinessStatus = 'PAUSED';
    const profileFilters: Prisma.CandidateOccupationProfileWhereInput[] = [];
    if (query.skill) profileFilters.push({ skills: { array_contains: [query.skill] } });
    if (query.desiredLocation) profileFilters.push({ desiredLocation: { contains: query.desiredLocation, mode: 'insensitive' } });
    if (query.occupationId) profileFilters.push({ occupation: { contains: query.occupationId, mode: 'insensitive' } });
    if (query.industrySectorId) profileFilters.push({ industryLabel: query.industrySectorId });
    if (query.experience) {
      const minimum = query.experience === '6+' ? 6 : Number(query.experience.split('-')[0]);
      if (!Number.isNaN(minimum)) profileFilters.push({ yearsExperience: { gte: minimum } });
    }
    if (profileFilters.length) where.profiles = { some: { AND: profileFilters } };
    if (cursor) {
      where.AND = [{ OR: [{ updatedAt: { lt: new Date(cursor.updatedAt) } }, { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } }] }];
    }
    const rows = await this.prisma.candidate.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: limit + 1, include: { owner: { select: { displayName: true } }, profiles: true } });
    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit).map((row) => this.map(row)), hasMore };
  }

  async createOccupationProfile(input: Parameters<CandidateRepository['createOccupationProfile']>[0]): Promise<OccupationProfileEntity> {
    const row = await this.prisma.candidateOccupationProfile.create({ data: {
      candidateId: input.candidateId,
      industryLabel: input.industryLabel,
      occupation: input.occupation,
      yearsExperience: input.yearsExperience,
      skills: input.skills,
      desiredLocation: input.desiredLocation,
      attributes: input.attributes as Prisma.InputJsonValue,
      schemaVersionId: input.schemaVersionId,
    } });
    return this.mapProfile(row);
  }

  async findActiveProfileSchema(schemaVersionId: string): Promise<{ industryCode: string; schema: Record<string, unknown> } | null> {
    const row = await this.prisma.catalogVersion.findFirst({
      where: { id: schemaVersionId, status: 'ACTIVE', item: { type: { in: ['INDUSTRY', 'OCCUPATION'] } } },
      select: { payload: true, item: { select: { code: true } } },
    });
    if (!row || !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) return null;
    const payload = row.payload as Record<string, unknown>;
    const schema = payload.schema;
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return null;
    return { industryCode: row.item.code, schema: schema as Record<string, unknown> };
  }

  async countActiveWork(candidateId: string): Promise<number> {
    const table = await this.prisma.$queryRaw<{ exists: boolean }[]>`SELECT to_regclass('public.applications') IS NOT NULL AS exists`;
    if (!table[0]?.exists) return 0;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT count(*) FROM applications WHERE candidate_id = $1 AND status NOT IN ('PASSED', 'FAILED', 'WITHDRAWN')", candidateId);
    return Number(rows[0]?.count ?? 0);
  }

  async searchForOrder(input: Parameters<NonNullable<CandidateRepository['searchForOrder']>>[0]): Promise<CandidateMatchEntity[]> {
    const where: Prisma.CandidateWhereInput = { recordStatus: 'ACTIVE' };
    if (input.scope === 'SELF') where.ownerId = input.ownerId;
    else if (input.teamId) where.teamId = input.teamId;
    else where.id = '__DENY_ALL__';
    if (input.japaneseLevel) where.japaneseLevel = input.japaneseLevel;
    if (input.readiness) where.readinessStatus = input.readiness;
    if (input.query?.trim()) {
      const term = input.query.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { normalizedName: { contains: term.toLocaleLowerCase(), mode: 'insensitive' } },
        { occupation: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (input.occupation?.trim()) where.occupation = { contains: input.occupation.trim(), mode: 'insensitive' };
    const rows = await this.prisma.candidate.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200, include: { owner: { select: { displayName: true } }, profiles: true } });
    const normalizedIndustry = input.industry?.trim().toLocaleLowerCase();
    const normalizedSkill = input.skill?.trim().toLocaleLowerCase();
    const filtered = rows.filter((row) => {
      const profiles = row.profiles ?? [];
      const labels = [...jsonArray(row.industryLabels), ...profiles.map((profile) => profile.industryLabel)];
      const skills = profiles.flatMap((profile) => jsonArray(profile.skills));
      return (!normalizedIndustry || labels.some((label) => label.toLocaleLowerCase() === normalizedIndustry)) && (!normalizedSkill || skills.some((skill) => skill.toLocaleLowerCase().includes(normalizedSkill)));
    });
    const ids = filtered.map((row) => row.id);
    const [applications, journeys] = await Promise.all([
      ids.length ? this.prisma.application.findMany({ where: { jobOrderId: input.orderId, candidateId: { in: ids }, status: { notIn: ['PASSED', 'FAILED', 'WITHDRAWN'] } }, select: { candidateId: true } }) : [],
      ids.length ? this.prisma.supplyJourney.findMany({ where: { candidateId: { in: ids }, status: 'ACTIVE' }, select: { candidateId: true } }) : [],
    ]);
    const activeApplicationIds = new Set(applications.map((entry) => entry.candidateId));
    const activeJourneyIds = new Set(journeys.map((entry) => entry.candidateId));
    return filtered.map((row) => {
      const profile = row.profiles.find((entry) => entry.status !== 'ARCHIVED') ?? row.profiles[0];
      return { id: row.id, code: row.code, name: row.name, industryLabel: profile?.industryLabel ?? jsonArray(row.industryLabels)[0] ?? '', occupation: profile?.occupation ?? row.occupation, japaneseLevel: row.japaneseLevel, readinessStatus: row.readinessStatus as CandidateMatchEntity['readinessStatus'], recordStatus: row.recordStatus as CandidateMatchEntity['recordStatus'], hasActiveApplicationInOrder: activeApplicationIds.has(row.id), hasActiveJourney: activeJourneyIds.has(row.id), skills: profile ? jsonArray(profile.skills) : [], yearsExperience: profile?.yearsExperience ?? 0 };
    });
  }

  private map(row: CandidateRow): CandidateEntity {
    return {
      id: row.id, code: row.code, name: row.name, normalizedName: row.normalizedName,
      industryLabels: jsonArray(row.industryLabels), occupation: row.occupation, japaneseLevel: row.japaneseLevel,
      source: row.source, recordStatus: row.recordStatus as CandidateEntity['recordStatus'], readinessStatus: row.readinessStatus as CandidateEntity['readinessStatus'],
      contactabilityStatus: row.contactabilityStatus as CandidateEntity['contactabilityStatus'], ownerId: row.ownerId, ownerName: row.owner?.displayName,
      teamId: row.teamId ?? undefined, email: decryptCandidateValue(row.emailCiphertext, this.secret), phone: decryptCandidateValue(row.phoneCiphertext, this.secret),
      address: decryptCandidateValue(row.addressCiphertext, this.secret), version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt,
      profiles: (row.profiles ?? []).map((profile) => this.mapProfile(profile)),
    };
  }

  private mapProfile(row: ProfileRow): OccupationProfileEntity {
    return { id: row.id, candidateId: row.candidateId, industryLabel: row.industryLabel, occupation: row.occupation, yearsExperience: row.yearsExperience, skills: jsonArray(row.skills), desiredLocation: row.desiredLocation, attributes: jsonObject(row.attributes), schemaVersionId: row.schemaVersionId, status: row.status as OccupationProfileEntity['status'], createdAt: row.createdAt, updatedAt: row.updatedAt };
  }
}
