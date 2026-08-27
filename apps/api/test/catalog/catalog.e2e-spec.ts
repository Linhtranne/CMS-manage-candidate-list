import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { RUNTIME_CONFIG } from '../../src/platform/config/config.module.js';
import type { RuntimeConfig } from '../../src/platform/config/config.schema.js';
import { configureApiApp } from '../../src/bootstrap/api-config.js';

describe('catalog API boundary', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApiApp(app, app.get<RuntimeConfig>(RUNTIME_CONFIG));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('keeps catalog administration behind an authenticated session', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/catalogs').expect(401);
    expect(response.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, requestId: expect.any(String) });
  });

  it('keeps catalog mutations behind authentication and CSRF', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/catalogs')
      .send({ type: 'INDUSTRY', code: 'IT', label: 'Công nghệ thông tin' })
      .expect(401);
    expect(response.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, requestId: expect.any(String) });
  });
});
