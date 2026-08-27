import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { RUNTIME_CONFIG } from '../../src/platform/config/config.module.js';
import type { RuntimeConfig } from '../../src/platform/config/config.schema.js';
import { configureApiApp } from '../../src/bootstrap/api-config.js';
import { SessionService, type SessionContext } from '../../src/modules/identity-access/application/session.service.js';

const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe('candidate permission boundary', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const session: SessionContext = {
      sessionId: '00000000-0000-0000-0000-000000000012', userId: '00000000-0000-0000-0000-000000000013', sessionHash: 'candidate-test-session', csrfHash: 'candidate-test-csrf', expiresAt: new Date(Date.now() + 60_000), teamId: '00000000-0000-0000-0000-000000000011',
      user: { id: '00000000-0000-0000-0000-000000000013', displayName: 'Candidate AC', email: 'candidate-ac@example.invalid', status: 'ACTIVE', roles: ['RECRUITER'], permissions: ['candidate.view'] },
      roles: [{ code: 'RECRUITER', scope: 'TEAM' }],
    };
    const builder = Test.createTestingModule({ imports: [AppModule] });
    if (liveDatabase) builder.overrideProvider(SessionService).useValue({ validateSession: vi.fn().mockResolvedValue(session) });
    const module = await builder.compile();
    app = module.createNestApplication();
    configureApiApp(app, app.get<RuntimeConfig>(RUNTIME_CONFIG));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('requires a session before candidate list or mutation validation', async () => {
    if (liveDatabase) return;
    const list = await request(app.getHttpServer()).get('/api/v1/candidates').expect(401);
    expect(list.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, requestId: expect.any(String) });
    const create = await request(app.getHttpServer()).post('/api/v1/candidates').send({ name: '' }).expect(401);
    expect(create.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, requestId: expect.any(String) });
  });

  it.skipIf(!liveDatabase)('serves the scoped candidate list through an authenticated session', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/candidates?limit=25').set('Cookie', 'cms_sid=synthetic-session').expect(200);
    expect(response.body).toMatchObject({ data: { items: expect.any(Array) }, page: { hasMore: false }, requestId: expect.any(String) });
  });
});
