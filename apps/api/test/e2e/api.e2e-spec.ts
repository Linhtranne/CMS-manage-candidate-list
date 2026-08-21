import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { RUNTIME_CONFIG } from '../../src/platform/config/config.module.js';
import type { RuntimeConfig } from '../../src/platform/config/config.schema.js';
import { configureApiApp } from '../../src/bootstrap/api-config.js';

describe('API provider contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApiApp(app, app.get<RuntimeConfig>(RUNTIME_CONFIG));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('serves liveness with the canonical success envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(response.body).toMatchObject({ data: { status: 'ok' }, requestId: expect.any(String) });
  });

  it('fails closed when OIDC is disabled', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/oidc/start').expect(503);
    expect(response.body).toMatchObject({ error: { code: 'OIDC_DISABLED' }, requestId: expect.any(String) });
  });

  it('rejects unauthenticated session access without leaking credentials', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/session').expect(401);
    expect(JSON.stringify(response.body)).not.toMatch(/password|secret|token/i);
    expect(response.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, requestId: expect.any(String) });
  });

  it('registers email cancellation and retry commands behind session auth', async () => {
    await request(app.getHttpServer()).post('/api/v1/email-messages/message-1/cancellations').send({ reason: 'operator requested' }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/email-messages/message-1/retry-attempts').send({}).expect(401);
  });

  it('registers shared inbox conversation list and detail behind session auth', async () => {
    await request(app.getHttpServer()).get('/api/v1/mailbox/conversations?view=needs-action&limit=10').expect(401);
    await request(app.getHttpServer()).get('/api/v1/mailbox/conversations/conversation-1').expect(401);
  });

  it('registers shared inbox send and link commands behind session and CSRF policy', async () => {
    await request(app.getHttpServer()).post('/api/v1/mailbox/conversations/conversation-1/send').send({ to: ['candidate@example.test'], subject: 'Reply', body: 'Thanks', idempotencyKey: 'reply-key-001', version: 1 }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/mailbox/conversations/conversation-1/link').send({ candidateId: '00000000-0000-0000-0000-000000000001', version: 1 }).expect(401);
  });

  it('registers the contract-aligned legacy email commands behind session and CSRF policy', async () => {
    await request(app.getHttpServer()).post('/api/v1/email-previews').send({ mailboxId: '00000000-0000-0000-0000-000000000001', from: 'ops@example.test', recipients: [{ kind: 'TO', address: 'candidate@example.test' }], subject: 'Preview', bodyText: 'Body' }).expect(401);
    await request(app.getHttpServer()).get('/api/v1/conversations/conversation-1/messages').expect(401);
    await request(app.getHttpServer()).post('/api/v1/conversations/conversation-1/messages').send({ to: ['candidate@example.test'], subject: 'Reply', body: 'Thanks', idempotencyKey: 'legacy-key-001', version: 1 }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/email-drafts').send({ mailboxId: '00000000-0000-0000-0000-000000000001', to: ['candidate@example.test'], subject: 'Draft', body: 'Body' }).expect(401);
    await request(app.getHttpServer()).post('/api/v1/inbox/messages/message-1/match-decisions').send({ candidateId: '00000000-0000-0000-0000-000000000001', reason: 'reviewed' }).expect(401);
  });
});
