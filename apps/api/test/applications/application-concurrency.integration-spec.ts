import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import { ApplicationService } from '../../src/modules/applications-interviews/application/application.service.js';

const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!liveDatabase)('application aggregate PostgreSQL contract', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let service: ApplicationService;
  let teamId: string;
  let userId: string;
  let otherTeamId: string;
  let otherUserId: string;
  let candidateId: string;
  let jobOrderId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await module.init();
    prisma = module.get(PrismaService);
    service = module.get(ApplicationService);
    const team = await prisma.team.create({ data: { code: `APP-${randomUUID().slice(0, 8)}`, name: 'Application AC Team' } });
    const otherTeam = await prisma.team.create({ data: { code: `APP-X-${randomUUID().slice(0, 8)}`, name: 'Other AC Team' } });
    const user = await prisma.user.create({ data: { displayName: 'Application Owner', email: `application-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: team.id } });
    const otherUser = await prisma.user.create({ data: { displayName: 'Other Owner', email: `other-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: otherTeam.id } });
    const client = await prisma.client.create({ data: { code: `CL-${randomUUID().slice(0, 8)}`, name: 'AC Client', organizationType: 'COMPANY', industryLabels: ['IT'], region: 'Tokyo', ownerId: user.id, teamId: team.id, status: 'ACTIVE' } });
    const item = await prisma.catalogItem.create({ data: { type: 'OCCUPATION', code: `CAT-${randomUUID().slice(0, 8).toUpperCase()}` } });
    const catalog = await prisma.catalogVersion.create({ data: { itemId: item.id, version: 1, status: 'ACTIVE', labelVi: 'Backend', payload: { code: 'BACKEND' } } });
    const order = await prisma.jobOrder.create({ data: { code: `JO-${randomUUID().slice(0, 8)}`, position: 'Backend Engineer', clientId: client.id, industryLabel: 'IT', occupation: 'BACKEND', location: 'Tokyo', target: 1, deadline: new Date(Date.now() + 86_400_000), ownerId: user.id, teamId: team.id, status: 'OPEN', requirementCatalogVersionId: catalog.id, requirementSnapshot: { catalogVersionId: catalog.id, criteria: ['Node.js'] }, requirements: { create: { version: 1, catalogVersionId: catalog.id, snapshot: { catalogVersionId: catalog.id, criteria: ['Node.js'] } } } } });
    const candidate = await prisma.candidate.create({ data: { code: `CA-${randomUUID().slice(0, 8)}`, name: 'Application Candidate', normalizedName: 'application candidate', industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', source: 'TEST', ownerId: user.id, teamId: team.id } });
    teamId = team.id; userId = user.id; otherTeamId = otherTeam.id; otherUserId = otherUser.id; candidateId = candidate.id; jobOrderId = order.id;
  });

  afterAll(async () => { await module.close(); });

  it('allows only one active candidate/order attempt under concurrent create', async () => {
    const context = { actorId: userId, teamId, scope: 'TEAM' as const, requestId: 'app-concurrency', correlationId: randomUUID() };
    const results = await Promise.allSettled([service.create(jobOrderId, candidateId, 'MANUAL_MATCH', context), service.create(jobOrderId, candidateId, 'MANUAL_MATCH', context)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ code: 'ACTIVE_APPLICATION_EXISTS', statusCode: 409 });
  });

  it('enforces scope and transition/version rules', async () => {
    const app = await prisma.application.findFirstOrThrow({ where: { candidateId, jobOrderId } });
    await expect(service.get(app.id, { actorId: otherUserId, teamId: otherTeamId, scope: 'TEAM', requestId: 'scope', correlationId: 'scope' })).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
    const context = { actorId: userId, teamId, scope: 'TEAM' as const, requestId: 'app-transition', correlationId: randomUUID() };
    await expect(service.transition(app.id, 'PASSED', app.version, undefined, context)).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    const updated = await service.transition(app.id, 'IN_INTERVIEW_PROCESS', app.version, undefined, context);
    expect(updated.status).toBe('IN_INTERVIEW_PROCESS');
    await expect(service.transition(app.id, 'PASSED', updated.version, undefined, context)).rejects.toMatchObject({ code: 'REQUIRED_FEEDBACK_MISSING' });
    await expect(service.transition(app.id, 'ON_HOLD', app.version, undefined, context)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
});
