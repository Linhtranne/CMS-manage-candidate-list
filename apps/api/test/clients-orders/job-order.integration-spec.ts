import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { Client as PgClient } from 'pg';
import { AppModule } from '../../src/app.module.js';
import { RUNTIME_CONFIG } from '../../src/platform/config/config.module.js';
import type { RuntimeConfig } from '../../src/platform/config/config.schema.js';
import { configureApiApp } from '../../src/bootstrap/api-config.js';
import { SessionService, type SessionContext } from '../../src/modules/identity-access/application/session.service.js';

const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);
const teamId = '00000000-0000-0000-0000-000000000001';

describe('clients and orders acceptance rehearsal', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!liveDatabase) return;
    const session: SessionContext = {
      sessionId: '00000000-0000-0000-0000-000000000002',
      userId: '00000000-0000-0000-0000-000000000003',
      sessionHash: 'test-session-hash',
      csrfHash: 'test-csrf-hash',
      expiresAt: new Date(Date.now() + 60_000),
      teamId,
      user: {
        id: '00000000-0000-0000-0000-000000000003',
        displayName: 'AC rehearsal',
        email: 'ac-rehearsal@example.invalid',
        status: 'ACTIVE',
        roles: ['RECRUITER'],
        permissions: ['client.view', 'job_order.view'],
      },
      roles: [{ code: 'RECRUITER', scope: 'TEAM' }],
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SessionService)
      .useValue({ validateSession: vi.fn().mockResolvedValue(session) })
      .compile();
    app = module.createNestApplication();
    configureApiApp(app, app.get<RuntimeConfig>(RUNTIME_CONFIG));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it.skipIf(!liveDatabase)('serves the scoped client list through an authenticated session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/clients?limit=25')
      .set('Cookie', 'cms_sid=synthetic-session')
      .expect(200);

    expect(response.body).toMatchObject({
      data: { items: expect.any(Array) },
      page: { hasMore: false },
      requestId: expect.any(String),
    });
  });

  it.skipIf(!liveDatabase)('keeps the stable team/status/deadline index in the query plan', async () => {
    const client = new PgClient({ connectionString: process.env.TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query('SET enable_seqscan = off');
      const result = await client.query<{ 'QUERY PLAN': unknown }>(
        `EXPLAIN (FORMAT JSON)
         SELECT id
         FROM job_orders
         WHERE team_id = $1 AND status = $2
         ORDER BY deadline ASC, id ASC
         LIMIT 25`,
        [teamId, 'OPEN'],
      );
      expect(JSON.stringify(result.rows[0]?.['QUERY PLAN'])).toContain('job_orders_team_status_deadline_idx');
    } finally {
      await client.end();
    }
  });
});
