import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import { ApplicationService } from '../../src/modules/applications-interviews/application/application.service.js';
import { InterviewService } from '../../src/modules/applications-interviews/application/interview.service.js';

const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!liveDatabase)('interview aggregate PostgreSQL contract', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let applications: ApplicationService;
  let interviews: InterviewService;
  let teamId: string;
  let ownerId: string;
  let participantId: string;
  let applicationId: string;
  let templateVersionId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await module.init();
    prisma = module.get(PrismaService); applications = module.get(ApplicationService); interviews = module.get(InterviewService);
    const team = await prisma.team.create({ data: { code: `INT-${randomUUID().slice(0, 8)}`, name: 'Interview AC Team' } });
    const owner = await prisma.user.create({ data: { displayName: 'Interview Owner', email: `interview-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: team.id } });
    const participant = await prisma.user.create({ data: { displayName: 'Interview Participant', email: `participant-${randomUUID()}@example.invalid`, status: 'ACTIVE', teamId: team.id } });
    const client = await prisma.client.create({ data: { code: `CL-${randomUUID().slice(0, 8)}`, name: 'Interview Client', organizationType: 'COMPANY', industryLabels: ['IT'], region: 'Tokyo', ownerId: owner.id, teamId: team.id, status: 'ACTIVE' } });
    const item = await prisma.catalogItem.create({ data: { type: 'OCCUPATION', code: `INT-CAT-${randomUUID().slice(0, 8).toUpperCase()}` } });
    const catalog = await prisma.catalogVersion.create({ data: { itemId: item.id, version: 1, status: 'ACTIVE', labelVi: 'Backend', payload: { code: 'BACKEND' } } });
    const template = await prisma.interviewQuestionTemplate.create({ data: { code: `INT-TPL-${randomUUID().slice(0, 8).toUpperCase()}`, name: 'Synthetic interview template', versions: { create: { version: 1, status: 'ACTIVE', questions: [{ id: 'q1', prompt: 'Explain a transaction.' }] } } }, include: { versions: true } });
    templateVersionId = template.versions[0]!.id;
    const order = await prisma.jobOrder.create({ data: { code: `JO-${randomUUID().slice(0, 8)}`, position: 'Backend Engineer', clientId: client.id, industryLabel: 'IT', occupation: 'BACKEND', location: 'Tokyo', target: 1, deadline: new Date(Date.now() + 86_400_000), ownerId: owner.id, teamId: team.id, status: 'OPEN', requirementCatalogVersionId: catalog.id, requirementSnapshot: { catalogVersionId: catalog.id, criteria: ['Node.js'] }, requirements: { create: { version: 1, catalogVersionId: catalog.id, snapshot: { catalogVersionId: catalog.id, criteria: ['Node.js'] } } } } });
    const candidate = await prisma.candidate.create({ data: { code: `CA-${randomUUID().slice(0, 8)}`, name: 'Interview Candidate', normalizedName: 'interview candidate', industryLabels: ['IT'], occupation: 'BACKEND', japaneseLevel: 'N2', source: 'TEST', ownerId: owner.id, teamId: team.id } });
    teamId = team.id; ownerId = owner.id; participantId = participant.id;
    const created = await applications.create(order.id, candidate.id, 'MANUAL_MATCH', { actorId: owner.id, teamId: team.id, scope: 'TEAM', requestId: 'interview-setup', correlationId: randomUUID() });
    applicationId = created.id;
  });

  afterAll(async () => { await module.close(); });

  it('AC-18/AC-24 allocates rounds atomically, rejects schedule overlap, and preserves reschedule history', async () => {
    const context = { actorId: ownerId, teamId, scope: 'TEAM' as const, requestId: 'interview-create', correlationId: randomUUID() };
    const start = new Date(Date.now() + 86_400_000);
    const input = { scheduledAt: start, scheduledEndAt: new Date(start.getTime() + 3_600_000), timeZone: 'Asia/Tokyo', mode: 'ONLINE' as const, meetingUrl: 'https://meet.example.invalid/one', participants: [participantId] };
    const results = await Promise.allSettled([interviews.create(applicationId, input, context), interviews.create(applicationId, { ...input, meetingUrl: 'https://meet.example.invalid/two' }, context)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason as { code?: string };
    expect(['INTERVIEW_SCHEDULE_CONFLICT', 'INTERVIEW_ROUND_CONFLICT']).toContain(rejected?.code);
    const fulfilled = results.find((result) => result.status === 'fulfilled');
    if (!fulfilled || fulfilled.status !== 'fulfilled') throw new Error('expected one interview create to succeed');
    const created = fulfilled.value as { id: string; version: number };
    const rescheduled = await interviews.reschedule(applicationId, created.id, { ...input, scheduledAt: new Date(start.getTime() + 7_200_000), scheduledEndAt: new Date(start.getTime() + 10_800_000), meetingUrl: input.meetingUrl, reason: 'client requested new slot' }, created.version, context);
    expect(rescheduled.version).toBe(2);
    expect(await prisma.interviewHistory.count({ where: { interviewId: created.id, action: 'RESCHEDULED' } })).toBe(1);
    expect((await applications.list({ view: 'waiting-interview' }, context)).items.some((item) => item.id === applicationId)).toBe(true);
  });

  it('AC-03 requires feedback, keeps the question snapshot immutable, and exposes interviewed view', async () => {
    const context = { actorId: ownerId, teamId, scope: 'TEAM' as const, requestId: 'interview-result', correlationId: randomUUID() };
    const start = new Date(Date.now() + 172_800_000);
    const created = await interviews.create(applicationId, { scheduledAt: start, scheduledEndAt: new Date(start.getTime() + 3_600_000), timeZone: 'Asia/Tokyo', mode: 'IN_PERSON', location: 'Tokyo Office', participants: [participantId] }, context);
    await expect(interviews.complete(applicationId, created.id, { result: 'PASS', feedback: '', strengths: [], concerns: [] }, created.version, context)).rejects.toMatchObject({ code: 'REQUIRED_FEEDBACK_MISSING' });
    const completed = await interviews.complete(applicationId, created.id, { result: 'PASS', feedback: 'Strong technical depth', strengths: ['Ownership'], concerns: [], nextStep: 'Decision' }, created.version, context);
    expect(completed.scheduleStatus).toBe('COMPLETED');
    expect(completed.result).toBe('PASS');
    expect('questionSnapshot' in completed).toBe(false);
    const stored = await prisma.interview.findUniqueOrThrow({ where: { id: created.id }, select: { questionSnapshot: true } });
    expect(stored.questionSnapshot).toMatchObject({ templateVersionId, version: 1, questions: [{ id: 'q1' }] });
    expect((await applications.list({ view: 'interviewed' }, context)).items.some((item) => item.id === applicationId)).toBe(true);
  });
});
