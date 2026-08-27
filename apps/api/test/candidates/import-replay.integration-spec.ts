import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import { CandidateImportService } from '../../src/modules/candidates/application/import.service.js';
import { CandidateMergeService } from '../../src/modules/candidates/application/merge.service.js';
import { CandidateService } from '../../src/modules/candidates/application/candidate.service.js';

const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!liveDatabase)('candidate import and merge PostgreSQL contract', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let imports: CandidateImportService;
  let merges: CandidateMergeService;
  let candidates: CandidateService;
  let teamId: string;
  let ownerId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await module.init();
    prisma = module.get(PrismaService); imports = module.get(CandidateImportService); merges = module.get(CandidateMergeService); candidates = module.get(CandidateService);
    const team = await prisma.team.create({ data: { code: `IMP-${randomUUID().slice(0, 8)}`, name: 'Import AC Team' } });
    const owner = await prisma.user.create({ data: { displayName: 'Import Owner', email: `import-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: team.id } });
    teamId = team.id; ownerId = owner.id;
  });

  afterAll(async () => { await module.close(); });

  it('creates masked preview, commits row-atomically, and replays idempotently', async () => {
    const email = `imported-${randomUUID()}@example.invalid`;
    const created = await imports.create({ ownerId, teamId, fileName: 'candidates.json', rows: [
      { name: `Imported Candidate ${randomUUID().slice(0, 6)}`, industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', email, passportNumber: `IMP-${randomUUID().slice(0, 8)}` },
      { name: '', industryLabels: [], occupation: 'BACKEND', japaneseLevel: 'N2', email: 'secret@example.invalid' },
    ] });
    const preview = await imports.preview(created.importId, ownerId, teamId);
    expect(preview.validRows).toBe(1);
    expect(preview.invalidRows).toBe(1);
    expect(preview.rows[0]?.sample).toMatchObject({ email: '[MASKED]', passportNumber: '[MASKED]' });
    const context = { actorId: ownerId, teamId, requestId: 'import-commit', correlationId: randomUUID() };
    const result = await imports.commit(created.importId, created.previewToken, ownerId, teamId, context);
    expect(result.createdCandidateIds).toHaveLength(1);
    expect(result.invalidRows).toBe(1);
    const replay = await imports.commit(created.importId, created.previewToken, ownerId, teamId, context);
    expect(replay.createdCandidateIds).toEqual(result.createdCandidateIds);
    expect(await prisma.candidateImportRow.count({ where: { batchId: created.importId, state: 'CREATED' } })).toBe(1);
  });

  it('creates an exact duplicate case and preserves winner/loser merge history', async () => {
    const duplicateEmail = `merge-${randomUUID()}@example.invalid`;
    const first = await candidates.create({ name: 'Merge Winner', industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', source: 'TEST', email: duplicateEmail }, { actorId: ownerId, teamId, requestId: 'merge-seed', correlationId: randomUUID() });
    const duplicateImport = await imports.create({ ownerId, teamId, fileName: 'duplicate.json', rows: [{ name: 'Duplicate', industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', email: duplicateEmail }] });
    const result = await imports.commit(duplicateImport.importId, duplicateImport.previewToken, ownerId, teamId, { actorId: ownerId, teamId, requestId: 'duplicate', correlationId: randomUUID() });
    expect(result.duplicateRows).toBe(1);
    const loser = await prisma.candidate.create({ data: { code: `CA-${randomUUID().slice(0, 8)}`, name: 'Merge Loser', normalizedName: 'merge loser', industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', source: 'TEST', ownerId, teamId } });
    const merged = await merges.merge({ winnerCandidateId: first.id, loserCandidateId: loser.id, reason: 'verified same person', expectedVersion: loser.version }, { actorId: ownerId, teamId, requestId: 'merge', correlationId: randomUUID() });
    expect(merged.winnerCandidateId).toBe(first.id);
    expect((await prisma.candidate.findUniqueOrThrow({ where: { id: loser.id } })).recordStatus).toBe('ARCHIVED');
    expect(await prisma.candidateMergeAlias.count({ where: { loserCandidateId: loser.id } })).toBe(1);
  });
});
