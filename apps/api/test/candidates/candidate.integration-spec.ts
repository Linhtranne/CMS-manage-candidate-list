import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { CandidateService } from '../../src/modules/candidates/application/candidate.service.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import {
  CandidateDomainError,
  assertArchiveAllowed,
  maskEmail,
  maskPhone,
  normalizeEmail,
  normalizePhone,
  validateProfileAttributes,
  validateCandidateInput,
} from '../../src/modules/candidates/domain/candidate.rules.js';

describe('candidate domain contract', () => {
  it('keeps record, readiness and contactability statuses independent', () => {
    const value = validateCandidateInput({
      name: ' Nguyễn Văn A ',
      industryLabels: ['IT'],
      occupation: 'Backend Engineer',
      japaneseLevel: 'N2',
      source: 'REFERRAL',
      readinessStatus: 'READY',
      contactabilityStatus: 'DO_NOT_CONTACT',
    });

    expect(value).toMatchObject({
      name: 'Nguyễn Văn A',
      recordStatus: 'ACTIVE',
      readinessStatus: 'READY',
      contactabilityStatus: 'DO_NOT_CONTACT',
    });
  });

  it('normalizes exact-match fields without inventing fuzzy thresholds', () => {
    expect(normalizeEmail(' Person@Example.COM ')).toBe('person@example.com');
    expect(normalizePhone(' +84 912-345-678 ')).toBe('+84912345678');
    expect(() => validateCandidateInput({ name: 'A', industryLabels: [], occupation: 'IT', japaneseLevel: 'N3', source: 'IMPORT' })).toThrow(CandidateDomainError);
  });

  it('masks contact values in normal candidate responses', () => {
    expect(maskEmail('person@example.com')).toBe('p****@example.com');
    expect(maskPhone('+84912345678')).toBe('******5678');
    expect(maskEmail(null)).toBeNull();
  });

  it('requires a reason and blocks archive while active work exists', () => {
    expect(() => assertArchiveAllowed({ recordStatus: 'ACTIVE', activeWorkCount: 1, reason: 'done' })).toThrowError(/CANDIDATE_HAS_ACTIVE_WORK/);
    expect(() => assertArchiveAllowed({ recordStatus: 'ACTIVE', activeWorkCount: 0, reason: '' })).toThrowError(/REASON_REQUIRED/);
    expect(assertArchiveAllowed({ recordStatus: 'ACTIVE', activeWorkCount: 0, reason: 'duplicate reviewed' })).toBeUndefined();
  });

  it('AC-22 keeps dynamic profile attributes inside an approved JSON schema boundary', () => {
    expect(validateProfileAttributes({ level: 'senior' })).toEqual({ level: 'senior' });
    expect(() => validateProfileAttributes({ '$ref': 'https://evil.invalid/schema' })).toThrowError(/INVALID_PROFILE_ATTRIBUTES/);
    const schema = { type: 'object', required: ['level'], additionalProperties: false, properties: { level: { type: 'string' } } };
    expect(validateProfileAttributes({ level: 'senior' }, schema)).toEqual({ level: 'senior' });
    expect(() => validateProfileAttributes({}, schema)).toThrowError(/PROFILE_ATTRIBUTE_REQUIRED/);
    expect(() => validateProfileAttributes({ level: 3 }, schema)).toThrowError(/PROFILE_ATTRIBUTE_INVALID/);
  });
});

describe('candidate persistence contract', () => {
  const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);
  let module: TestingModule | undefined;
  let candidateService: CandidateService;
  let prisma: PrismaService;
  let teamId: string;
  let userId: string;

  beforeAll(async () => {
    if (!liveDatabase) return;
    const compiled = await Test.createTestingModule({ imports: [AppModule] }).compile();
    module = compiled;
    await compiled.init();
    candidateService = compiled.get(CandidateService);
    prisma = compiled.get(PrismaService);
    const team = await prisma.team.create({ data: { code: `CAND-${randomUUID().slice(0, 8)}`, name: 'Candidate AC Team' } });
    const user = await prisma.user.create({ data: { displayName: 'Candidate AC User', email: `candidate-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: team.id } });
    teamId = team.id;
    userId = user.id;
  });

  afterAll(async () => { if (module) await module.close(); });

  it.skipIf(!liveDatabase)('encrypts contact fields, persists audit/outbox and archives with a reason', async () => {
    const context = { actorId: userId, teamId, requestId: 'candidate-test-request', correlationId: 'candidate-test-correlation' };
    const passport = `P${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    const email = `candidate.person.${randomUUID()}@example.invalid`;
    const phone = `+84912${Date.now().toString().slice(-6)}`;
    const created = await candidateService.create({ name: '  Candidate Person  ', industryLabels: ['IT'], occupation: 'Backend Engineer', japaneseLevel: 'N2', source: 'TEST', email, phone, passportNumber: ` ${passport} ` }, context);
    expect(created.email).toBe(email);
    expect(created.phone).toBe(phone);
    const stored = await prisma.candidate.findUnique({ where: { id: created.id }, select: { emailCiphertext: true, emailBlindIndex: true, passportCiphertext: true, passportBlindIndex: true } });
    expect(stored?.emailCiphertext).toBeTruthy();
    expect(stored?.emailCiphertext).not.toContain(email);
    expect(stored?.emailBlindIndex).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.passportCiphertext).toBeTruthy();
    expect(stored?.passportCiphertext).not.toContain(passport);
    expect(stored?.passportBlindIndex).toMatch(/^[0-9a-f]{64}$/);
    await expect(candidateService.create({ name: 'Duplicate Person', industryLabels: ['IT'], occupation: 'Backend Engineer', japaneseLevel: 'N3', source: 'TEST', passportNumber: passport }, context)).rejects.toMatchObject({ code: 'DUPLICATE_CANDIDATE_REVIEW_REQUIRED' });
    await candidateService.archive(created.id, created.version, 'synthetic AC cleanup', context, { ownerId: userId, teamId, level: 'TEAM' });
    const audit = await prisma.auditEvent.findFirst({ where: { entityId: created.id, action: 'CANDIDATE_ARCHIVED' } });
    const outbox = await prisma.outboxEvent.findFirst({ where: { aggregateId: created.id, eventType: 'candidate.updated' } });
    expect(audit).not.toBeNull();
    expect(outbox).not.toBeNull();
  });

  it.skipIf(!liveDatabase)('AC-22 binds occupation profiles to an ACTIVE approved schema version', async () => {
    const context = { actorId: userId, teamId, requestId: 'candidate-schema-request', correlationId: 'candidate-schema-correlation' };
    const item = await prisma.catalogItem.create({ data: { type: 'INDUSTRY', code: `SCHEMA-${randomUUID().slice(0, 8).toUpperCase()}` } });
    const catalog = await prisma.catalogVersion.create({ data: { itemId: item.id, version: 1, status: 'ACTIVE', labelVi: 'IT schema', payload: { schema: { type: 'object', required: ['level'], additionalProperties: false, properties: { level: { type: 'string' } } } } } });
    const candidate = await candidateService.create({ name: 'Schema Candidate', industryLabels: [item.code], occupation: 'Engineer', japaneseLevel: 'N2', source: 'TEST' }, context);
    const profile = await candidateService.addOccupationProfile(candidate.id, { industryLabel: item.code, occupation: 'Engineer', yearsExperience: 3, skills: ['TypeScript'], attributes: { level: 'senior' }, schemaVersionId: catalog.id }, context, { ownerId: userId, teamId, level: 'TEAM' });
    expect(profile.schemaVersionId).toBe(catalog.id);
    await expect(candidateService.addOccupationProfile(candidate.id, { industryLabel: item.code, occupation: 'Manager', yearsExperience: 3, skills: [], attributes: { level: 3 }, schemaVersionId: catalog.id }, context, { ownerId: userId, teamId, level: 'TEAM' })).rejects.toMatchObject({ code: 'PROFILE_ATTRIBUTE_INVALID' });
    await expect(candidateService.addOccupationProfile(candidate.id, { industryLabel: item.code, occupation: 'Designer', yearsExperience: 3, skills: [], attributes: { level: 'senior' }, schemaVersionId: randomUUID() }, context, { ownerId: userId, teamId, level: 'TEAM' })).rejects.toMatchObject({ code: 'PROFILE_SCHEMA_NOT_APPROVED' });
  });
});
