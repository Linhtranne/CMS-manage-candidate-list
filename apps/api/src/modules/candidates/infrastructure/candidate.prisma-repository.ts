import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { decryptCandidateValue } from './candidate.crypto.js';
import { decodeCandidateCursor, candidateLimit } from '../domain/pagination.js';
import type { CandidateRepository } from '../application/candidate.service.js';
import type { CandidateApplicationSummary, CandidateEntity, CandidateFileSummary, CandidateJourneySummary, CandidateListQuery, CandidateMatchEntity, OccupationProfileEntity } from '../domain/candidate.types.js';

type CandidateClient = PrismaService | Prisma.TransactionClient;
type CandidateRow = Prisma.CandidateGetPayload<{ include: { owner: { select: { displayName: true } }; profiles: true } }>;
type ProfileRow = Prisma.CandidateOccupationProfileGetPayload<object>;
type CandidateApplicationRow = Prisma.ApplicationGetPayload<{ include: { jobOrder: { include: { client: { select: { id: true; name: true } } } }; owner: { select: { id: true; displayName: true } }; interviews: { orderBy: { roundNo: 'asc' }; select: { id: true; roundNo: true; scheduledAt: true; scheduleStatus: true; result: true; version: true } } } }>;
type CandidateJourneyRow = Prisma.SupplyJourneyGetPayload<{ include: { milestones: { orderBy: { sequence: 'asc' }; select: { status: true; name: true; dueAt: true; completedAt: true } } } }>;
type JourneyOrderRow = { id: string; code: string; position: string; client: { id: string; name: string } };
type CandidateDocumentRow = Prisma.DocumentGetPayload<{ include: { versions: { orderBy: { versionNo: 'desc' }; take: 1 } } }>;

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
    return row ? this.enrich([this.map(row)]).then(([candidate]) => candidate ?? null) : null;
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
    if (query.view === 'ready-to-match') {
      where.readinessStatus = 'READY';
      where.applications = { none: {} };
    }
    if (query.view === 'new-unassigned') where.applications = { none: {} };
    if (query.view === 'applying') where.applications = { some: { status: { notIn: ['PASSED', 'FAILED', 'WITHDRAWN'] } } };
    if (query.view === 'passed') where.applications = { some: { status: 'PASSED' } };
    if (query.view === 'duplicates') where.duplicateSources = { some: { state: 'OPEN' } };
    if (query.view === 'paused') where.AND = [{ OR: [{ readinessStatus: 'PAUSED' }, { contactabilityStatus: 'DO_NOT_CONTACT' }] }];
    if (query.view === 'missing-contact') where.AND = [{ OR: [{ emailCiphertext: null }, { phoneCiphertext: null }, { contactabilityStatus: { in: ['TEMPORARILY_UNREACHABLE', 'DO_NOT_CONTACT'] } }] }];
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
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: [{ updatedAt: { lt: new Date(cursor.updatedAt) } }, { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } }] }];
    }
    if (query.view === 'supplying' || query.view === 'supplied') {
      const journeyRows = await this.prisma.supplyJourney.findMany({ where: { status: query.view === 'supplied' ? 'COMPLETED' : { in: ['ACTIVE', 'ON_HOLD'] } }, select: { candidateId: true } });
      const ids = [...new Set(journeyRows.map((row) => row.candidateId))];
      where.id = ids.length ? { in: ids } : '__DENY_ALL__';
    }
    if (query.view === 'missing-documents') {
      const documentRows = await this.prisma.document.findMany({ where: { status: { notIn: ['DELETED', 'REJECTED'] } }, select: { candidateId: true } });
      const candidatesWithDocuments = [...new Set(documentRows.map((row) => row.candidateId))];
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: [{ readinessStatus: { in: ['POTENTIAL', 'PAUSED', 'NOT_SUITABLE'] } }, ...(candidatesWithDocuments.length ? [{ id: { notIn: candidatesWithDocuments } }] : [])] }];
    }
    const rows = await this.prisma.candidate.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: limit + 1, include: { owner: { select: { displayName: true } }, profiles: true } });
    const hasMore = rows.length > limit;
    return { items: await this.enrich(rows.slice(0, limit).map((row) => this.map(row))), hasMore };
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
      passportNumber: decryptCandidateValue(row.passportCiphertext, this.secret), address: decryptCandidateValue(row.addressCiphertext, this.secret), version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt,
      profiles: (row.profiles ?? []).map((profile) => this.mapProfile(profile)),
    };
  }

  private async enrich(candidates: CandidateEntity[]): Promise<CandidateEntity[]> {
    if (!candidates.length) return candidates;
    const ids = candidates.map((candidate) => candidate.id);
    const [applications, journeys, duplicates, documents, emailCounts, entityNotes] = await Promise.all([
      this.prisma.application.findMany({
        where: { candidateId: { in: ids } },
        orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
        include: {
          jobOrder: { include: { client: { select: { id: true, name: true } } } },
          owner: { select: { id: true, displayName: true } },
          interviews: { orderBy: { roundNo: 'asc' }, select: { id: true, roundNo: true, scheduledAt: true, scheduleStatus: true, result: true, version: true } },
        },
      }),
      this.prisma.supplyJourney.findMany({
        where: { candidateId: { in: ids } },
        include: { milestones: { orderBy: { sequence: 'asc' }, select: { status: true, name: true, dueAt: true, completedAt: true } } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.candidateDuplicateCase.findMany({ where: { sourceCandidateId: { in: ids }, state: 'OPEN' }, select: { sourceCandidateId: true } }),
      this.prisma.document.findMany({ where: { candidateId: { in: ids }, status: { notIn: ['DELETED', 'REJECTED'] } }, include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } } }),
      this.prisma.emailConversation.groupBy({ by: ['candidateId'], where: { candidateId: { in: ids } }, _count: { _all: true } }),
      this.prisma.entityNote.findMany({ where: { entityType: 'CANDIDATE', entityId: { in: ids } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { entityId: true, content: true } }),
    ]);
    const journeyApplicationIds = [...new Set(journeys.map((journey) => journey.applicationId))];
    const [journeyApplications, templateVersions, journeyOwners] = await Promise.all([
      journeyApplicationIds.length ? this.prisma.application.findMany({ where: { id: { in: journeyApplicationIds } }, select: { id: true, jobOrder: { select: { id: true, code: true, position: true, client: { select: { id: true, name: true } } } } } }) : [],
      journeys.length ? this.prisma.supplyJourneyTemplateVersion.findMany({ where: { id: { in: journeys.map((journey) => journey.templateVersionId) } }, select: { id: true, template: { select: { name: true } } } }) : [],
      journeys.length ? this.prisma.user.findMany({ where: { id: { in: journeys.map((journey) => journey.ownerUserId) } }, select: { id: true, displayName: true } }) : [],
    ]);
    const applicationsByCandidate = new Map<string, typeof applications>();
    for (const application of applications) applicationsByCandidate.set(application.candidateId, [...(applicationsByCandidate.get(application.candidateId) ?? []), application]);
    const journeysByCandidate = new Map<string, typeof journeys>();
    for (const journey of journeys) journeysByCandidate.set(journey.candidateId, [...(journeysByCandidate.get(journey.candidateId) ?? []), journey]);
    const duplicateIds = new Set(duplicates.map((duplicate) => duplicate.sourceCandidateId));
    const documentByCandidate = new Map<string, typeof documents>();
    for (const document of documents) documentByCandidate.set(document.candidateId, [...(documentByCandidate.get(document.candidateId) ?? []), document]);
    const emailCountByCandidate = new Map(emailCounts.map((row) => [row.candidateId, row._count._all]));
    const notesByCandidate = new Map<string, string[]>();
    for (const note of entityNotes) notesByCandidate.set(note.entityId, [...(notesByCandidate.get(note.entityId) ?? []), note.content]);
    const journeyApplicationById = new Map(journeyApplications.map((row) => [row.id, row.jobOrder]));
    const templateById = new Map(templateVersions.map((row) => [row.id, row.template.name]));
    const ownerById = new Map(journeyOwners.map((row) => [row.id, row.displayName]));
    return candidates.map((candidate) => {
      const candidateApplications = applicationsByCandidate.get(candidate.id) ?? [];
      const candidateJourneys = journeysByCandidate.get(candidate.id) ?? [];
      const activeJourney = candidateJourneys.find((journey) => journey.status === 'ACTIVE' || journey.status === 'ON_HOLD');
      const completedJourney = candidateJourneys.find((journey) => journey.status === 'COMPLETED');
      const activeApplication = candidateApplications.find((application) => !['PASSED', 'FAILED', 'WITHDRAWN'].includes(application.status));
      const phase = completedJourney ? 'SUPPLIED' : activeJourney ? 'SUPPLYING' : candidateApplications.some((application) => application.status === 'PASSED') ? 'PASSED' : activeApplication ? 'APPLYING' : 'POTENTIAL';
      const profile = candidate.profiles.find((entry) => entry.status !== 'ARCHIVED') ?? candidate.profiles[0];
      return {
        ...candidate,
        applicationCount: candidateApplications.length,
        operationalPhase: phase,
        hasActiveJourney: Boolean(activeJourney),
        isPossibleDuplicate: duplicateIds.has(candidate.id),
        missingDocumentCount: candidate.readinessStatus === 'NOT_SUITABLE' || candidate.readinessStatus === 'PAUSED' ? Math.max(1, documentByCandidate.get(candidate.id)?.length ? 0 : 1) : documentByCandidate.get(candidate.id)?.length ? 0 : 0,
        nextAction: phase === 'POTENTIAL' ? candidate.contactabilityStatus === 'DO_NOT_CONTACT' ? 'REVIEW_PROFILE' : 'REVIEW_PROFILE' : phase === 'APPLYING' ? 'FOLLOW_UP_INTERVIEW' : phase === 'PASSED' ? 'START_SUPPLY_JOURNEY' : phase === 'SUPPLYING' ? 'COMPLETE_DOCUMENTS' : 'MONITOR_ONBOARDING',
        skills: profile?.skills ?? [],
        yearsExperience: profile?.yearsExperience ?? 0,
        desiredLocation: profile?.desiredLocation ?? null,
        applications: candidateApplications.map((application) => this.mapApplication(application)),
        journeys: candidateJourneys.map((journey) => this.mapJourney(journey, candidate, journeyApplicationById, templateById, ownerById)),
        emailCount: emailCountByCandidate.get(candidate.id) ?? 0,
        files: (documentByCandidate.get(candidate.id) ?? []).map((document) => this.mapDocument(document)),
        notes: notesByCandidate.get(candidate.id) ?? [],
        history: candidateApplications.map((application) => ({ id: `${application.id}:created`, type: 'APPLICATION_CREATED' as const, occurredAt: application.appliedAt.toISOString(), actor: application.owner ? { id: application.owner.id, name: application.owner.displayName } : { id: candidate.ownerId, name: candidate.ownerName ?? candidate.ownerId }, summary: `Tạo hồ sơ ứng tuyển ${application.jobOrder.code}.` })),
      };
    });
  }

  private mapApplication(application: CandidateApplicationRow): CandidateApplicationSummary {
    return {
      id: application.id,
      order: { id: application.jobOrder.id, code: application.jobOrder.code, position: application.jobOrder.position },
      client: { id: application.jobOrder.client.id, name: application.jobOrder.client.name },
      owner: { id: application.owner.id, name: application.owner.displayName },
      status: application.status,
      source: application.source,
      appliedAt: application.appliedAt.toISOString(),
      lastActivityAt: application.lastActivityAt.toISOString(),
      dueAt: application.dueAt?.toISOString() ?? null,
      version: application.version,
      interviews: application.interviews.map((interview) => ({ id: interview.id, round: interview.roundNo, scheduledAt: interview.scheduledAt.toISOString(), scheduleStatus: interview.scheduleStatus, result: interview.result, version: interview.version })),
      decisionReason: application.decisionReason,
    };
  }

  private mapJourney(journey: CandidateJourneyRow, candidate: CandidateEntity, orders: Map<string, JourneyOrderRow>, templates: Map<string, string>, owners: Map<string, string>): CandidateJourneySummary {
    const order = orders.get(journey.applicationId) ?? { id: journey.applicationId, code: '—', position: '—', client: { id: '', name: '—' } };
    const applicable = journey.milestones.length;
    const completed = journey.milestones.filter((milestone) => milestone.status === 'COMPLETED').length;
    const current = journey.milestones.find((milestone) => milestone.status !== 'COMPLETED');
    const nearest = journey.milestones.filter((milestone) => milestone.dueAt && milestone.status !== 'COMPLETED').sort((left, right) => left.dueAt!.getTime() - right.dueAt!.getTime())[0];
    const health = journey.status === 'COMPLETED' ? 'COMPLETED' : nearest?.dueAt && nearest.dueAt < new Date() ? 'OVERDUE' : current?.dueAt && current.dueAt.getTime() - Date.now() < 72 * 60 * 60 * 1000 ? 'AT_RISK' : 'ON_TRACK';
    return { id: journey.id, status: journey.status, candidate: { id: candidate.id, code: candidate.code, name: candidate.name }, order: { id: order.id, code: order.code, position: order.position }, client: { id: order.client.id, name: order.client.name }, owner: { id: journey.ownerUserId, name: owners.get(journey.ownerUserId) ?? journey.ownerUserId }, templateName: templates.get(journey.templateVersionId) ?? journey.templateVersionId, currentMilestone: current?.name ?? 'COMPLETED', nearestDueAt: nearest?.dueAt?.toISOString() ?? null, progress: { completed, applicable }, health };
  }

  private mapDocument(document: CandidateDocumentRow): CandidateFileSummary {
    const version = document.versions[0];
    return { id: document.id, fileName: document.title, category: document.category as CandidateFileSummary['category'], scanStatus: (version?.status ?? document.status) as CandidateFileSummary['scanStatus'], uploadedAt: document.updatedAt.toISOString(), downloadUrl: null };
  }

  private mapProfile(row: ProfileRow): OccupationProfileEntity {
    return { id: row.id, candidateId: row.candidateId, industryLabel: row.industryLabel, occupation: row.occupation, yearsExperience: row.yearsExperience, skills: jsonArray(row.skills), desiredLocation: row.desiredLocation, attributes: jsonObject(row.attributes), schemaVersionId: row.schemaVersionId, status: row.status as OccupationProfileEntity['status'], createdAt: row.createdAt, updatedAt: row.updatedAt };
  }
}
