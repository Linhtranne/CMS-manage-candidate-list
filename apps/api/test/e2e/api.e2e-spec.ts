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
});
