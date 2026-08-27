import { CandidateDomainError, assertArchiveAllowed, validateCandidateInput, validateProfileAttributes } from '../domain/candidate.rules.js';
import { assertCandidateScope } from '../domain/candidate.scope.js';
import type { CandidateCommandContext, CandidateEntity, CandidateListQuery, CandidateMatchEntity, OccupationProfileEntity } from '../domain/candidate.types.js';

export interface CandidateRepository {
  withTransaction<T>(work: (repository: CandidateRepository, transaction: unknown) => Promise<T>): Promise<T>;
  findById(id: string): Promise<CandidateEntity | null>;
  findDuplicateByBlindIndex(kind: 'passport' | 'email' | 'phone', blindIndex: string): Promise<CandidateEntity | null>;
  create(input: {
    name: string; normalizedName: string; industryLabels: string[]; occupation: string; japaneseLevel: string; source: string;
    readinessStatus: string; contactabilityStatus: string; recordStatus: string; ownerId: string; teamId?: string;
    emailCiphertext?: string | null; emailBlindIndex?: string | null; phoneCiphertext?: string | null; phoneBlindIndex?: string | null;
    addressCiphertext?: string | null; passportCiphertext?: string | null; passportBlindIndex?: string | null;
  }): Promise<CandidateEntity>;
  update(id: string, expectedVersion: number, input: Record<string, unknown>): Promise<CandidateEntity | null>;
  list(query: CandidateListQuery): Promise<{ items: CandidateEntity[]; hasMore: boolean }>;
  createOccupationProfile(input: {
    candidateId: string; industryLabel: string; occupation: string; yearsExperience: number; skills: string[];
    desiredLocation?: string | null; attributes: Record<string, unknown>; schemaVersionId?: string | null;
  }): Promise<OccupationProfileEntity>;
  findActiveProfileSchema(schemaVersionId: string): Promise<{ industryCode: string; schema: Record<string, unknown> } | null>;
  countActiveWork(candidateId: string): Promise<number>;
  searchForOrder?(input: { orderId: string; query?: string; industry?: string; occupation?: string; skill?: string; japaneseLevel?: string; readiness?: string; hasActiveJourney?: string; ownerId: string; teamId?: string; scope: 'SELF' | 'TEAM' }): Promise<CandidateMatchEntity[]>;
}

export interface CandidateMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string; metadata?: Record<string, unknown> }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }): Promise<void>;
}

function conflict(message: string): never { throw new CandidateDomainError('VERSION_CONFLICT', message, 409); }
function notFound(): never { throw new CandidateDomainError('CANDIDATE_NOT_FOUND', 'candidate was not found', 404); }

export class CandidateService {
  constructor(private readonly repository: CandidateRepository, private readonly secret: string, private readonly effects?: CandidateMutationEffects) {}

  async create(input: Parameters<typeof validateCandidateInput>[0], context: CandidateCommandContext): Promise<CandidateEntity> {
    const value = validateCandidateInput(input);
    if (value.recordStatus !== 'ACTIVE') throw new CandidateDomainError('CANDIDATE_CREATE_ACTIVE_REQUIRED', 'new candidates must start ACTIVE');
    const { candidateBlindIndex, encryptCandidateValue } = await import('../infrastructure/candidate.crypto.js');
    const duplicateIndexes = [
      value.passportNumber ? ['passport', candidateBlindIndex(value.passportNumber, this.secret)] as const : null,
      value.email ? ['email', candidateBlindIndex(value.email, this.secret)] as const : null,
      value.phone ? ['phone', candidateBlindIndex(value.phone, this.secret)] as const : null,
    ].filter((entry): entry is readonly ['passport' | 'email' | 'phone', string] => Boolean(entry?.[1]));
    for (const [kind, index] of duplicateIndexes) {
      if (await this.repository.findDuplicateByBlindIndex(kind, index)) throw new CandidateDomainError('DUPLICATE_CANDIDATE_REVIEW_REQUIRED', `${kind} already exists`, 409);
    }
    return this.repository.withTransaction(async (repository, transaction) => {
      let created: CandidateEntity;
      try {
        created = await repository.create({
          ...value,
          normalizedName: value.name.normalize('NFKC').toLocaleLowerCase(),
          ownerId: context.actorId,
          teamId: context.teamId,
          emailCiphertext: encryptCandidateValue(value.email, this.secret),
          emailBlindIndex: value.email ? candidateBlindIndex(value.email, this.secret) : null,
          phoneCiphertext: encryptCandidateValue(value.phone, this.secret),
          phoneBlindIndex: value.phone ? candidateBlindIndex(value.phone, this.secret) : null,
          addressCiphertext: encryptCandidateValue(value.address, this.secret),
          passportCiphertext: encryptCandidateValue(value.passportNumber, this.secret),
          passportBlindIndex: value.passportNumber ? candidateBlindIndex(value.passportNumber, this.secret) : null,
        });
      } catch (error) {
        if (error instanceof CandidateDomainError) throw error;
        if (String(error).includes('candidates_passport_blind_unique')) throw new CandidateDomainError('DUPLICATE_CANDIDATE_REVIEW_REQUIRED', 'passport already exists', 409);
        throw error;
      }
      await this.recordEffects(transaction, context, created, 'CANDIDATE_CREATED', 'candidate.created');
      return created;
    });
  }

  async get(id: string, scope?: { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' }): Promise<CandidateEntity> {
    const candidate = await this.repository.findById(id);
    if (!candidate) notFound();
    if (scope) assertCandidateScope(candidate, scope);
    return candidate;
  }

  async update(id: string, input: Parameters<typeof validateCandidateInput>[0], expectedVersion: number, context: CandidateCommandContext, scope?: { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' }): Promise<CandidateEntity> {
    const current = await this.get(id, scope);
    if (current.version !== expectedVersion) conflict('candidate version changed');
    if (input.recordStatus && input.recordStatus !== current.recordStatus) throw new CandidateDomainError('ARCHIVE_COMMAND_REQUIRED', 'recordStatus changes require the archive command', 422);
    const value = validateCandidateInput(input);
    const { candidateBlindIndex, encryptCandidateValue } = await import('../infrastructure/candidate.crypto.js');
    for (const [kind, raw] of [['email', value.email], ['phone', value.phone], ['passport', value.passportNumber]] as const) {
      if (!raw) continue;
      const duplicate = await this.repository.findDuplicateByBlindIndex(kind, candidateBlindIndex(raw, this.secret)!);
      if (duplicate && duplicate.id !== id) throw new CandidateDomainError('DUPLICATE_CANDIDATE_REVIEW_REQUIRED', `${kind} already exists`, 409);
    }
    const updated = await this.repository.withTransaction(async (repository, transaction) => {
      const result = await repository.update(id, expectedVersion, {
        name: value.name,
        industryLabels: value.industryLabels,
        occupation: value.occupation,
        japaneseLevel: value.japaneseLevel,
        source: value.source,
        readinessStatus: value.readinessStatus,
        contactabilityStatus: value.contactabilityStatus,
        recordStatus: value.recordStatus,
        normalizedName: value.name.normalize('NFKC').toLocaleLowerCase(),
        emailCiphertext: encryptCandidateValue(value.email, this.secret),
        emailBlindIndex: value.email ? candidateBlindIndex(value.email, this.secret) : null,
        phoneCiphertext: encryptCandidateValue(value.phone, this.secret),
        phoneBlindIndex: value.phone ? candidateBlindIndex(value.phone, this.secret) : null,
        addressCiphertext: encryptCandidateValue(value.address, this.secret),
        passportCiphertext: encryptCandidateValue(value.passportNumber, this.secret),
        passportBlindIndex: value.passportNumber ? candidateBlindIndex(value.passportNumber, this.secret) : null,
      });
      if (!result) conflict('candidate version changed');
      await this.recordEffects(transaction, context, result, 'CANDIDATE_UPDATED', 'candidate.updated');
      return result;
    });
    return updated;
  }

  async archive(id: string, expectedVersion: number, reason: string, context: CandidateCommandContext, scope?: { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' }): Promise<CandidateEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findById(id);
      if (!current) notFound();
      if (scope) assertCandidateScope(current, scope);
      if (current.version !== expectedVersion) conflict('candidate version changed');
      assertArchiveAllowed({ recordStatus: current.recordStatus, activeWorkCount: await repository.countActiveWork(id), reason });
      const result = await repository.update(id, expectedVersion, { recordStatus: 'ARCHIVED' });
      if (!result) conflict('candidate version changed');
      await this.recordEffects(transaction, context, result, 'CANDIDATE_ARCHIVED', 'candidate.updated');
      return result;
    });
  }

  async addOccupationProfile(id: string, input: Omit<Parameters<CandidateRepository['createOccupationProfile']>[0], 'candidateId'>, context: CandidateCommandContext, scope?: { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' }): Promise<OccupationProfileEntity> {
    await this.get(id, scope);
    return this.repository.withTransaction(async (repository, transaction) => {
      let schema: Record<string, unknown> | undefined;
      if (input.schemaVersionId) {
        const approved = await repository.findActiveProfileSchema(input.schemaVersionId);
        if (!approved || approved.industryCode !== input.industryLabel) {
          throw new CandidateDomainError('PROFILE_SCHEMA_NOT_APPROVED', 'profile schema must reference an active approved catalog version', 422);
        }
        schema = approved.schema;
      }
      const profile = await repository.createOccupationProfile({ candidateId: id, ...input, attributes: validateProfileAttributes(input.attributes, schema) });
      await this.recordEffects(transaction, context, { id }, 'CANDIDATE_PROFILE_ADDED', 'candidate.updated');
      return profile;
    });
  }

  async list(query: CandidateListQuery): Promise<{ items: CandidateEntity[]; page: { nextCursor: string | null; hasMore: boolean } }> {
    const result = await this.repository.list(query);
    const last = result.items.at(-1);
    const { encodeCandidateCursor } = await import('../domain/pagination.js');
    return { items: result.items, page: { hasMore: result.hasMore, nextCursor: result.hasMore && last ? encodeCandidateCursor({ updatedAt: last.updatedAt.toISOString(), id: last.id }) : null } };
  }

  async searchForOrder(input: Parameters<NonNullable<CandidateRepository['searchForOrder']>>[0]): Promise<CandidateMatchEntity[]> {
    if (this.repository.searchForOrder) return this.repository.searchForOrder(input);
    const result = await this.list({ query: input.query, industrySectorId: input.industry, occupationId: input.occupation, skill: input.skill, japaneseLevel: input.japaneseLevel, readinessStatus: input.readiness as never, ownerId: input.ownerId, teamId: input.teamId, scope: input.scope });
    return result.items.map((candidate) => {
      const profile = candidate.profiles.find((entry) => entry.status !== 'ARCHIVED') ?? candidate.profiles[0];
      return { id: candidate.id, code: candidate.code, name: candidate.name, industryLabel: profile?.industryLabel ?? candidate.industryLabels[0] ?? '', occupation: profile?.occupation ?? candidate.occupation, japaneseLevel: candidate.japaneseLevel, readinessStatus: candidate.readinessStatus, recordStatus: candidate.recordStatus, hasActiveApplicationInOrder: false, hasActiveJourney: false, skills: profile?.skills ?? [], yearsExperience: profile?.yearsExperience ?? 0 };
    });
  }

  private async recordEffects(transaction: unknown, context: CandidateCommandContext, entity: { id: string }, action: string, eventType: string): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId });
  }
}
