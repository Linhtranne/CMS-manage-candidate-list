import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/platform/config/config.schema.js';
import { OidcAdapter, OidcValidationError } from '../../src/modules/identity-access/infrastructure/oidc.adapter.js';
import { CsrfViolationError, SessionService } from '../../src/modules/identity-access/application/session.service.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';

function oidcConfig() {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    APP_ORIGIN: 'http://localhost:3000',
    OIDC_ISSUER: 'https://issuer.example.com',
    OIDC_CLIENT_ID: 'cms-client',
    OIDC_CLIENT_SECRET: 'client-secret',
    OIDC_REDIRECT_URI: 'http://localhost:3000/api/v1/auth/oidc/callback',
    OIDC_AUDIENCE: 'cms-api',
    ENCRYPTION_KEY: '12345678901234567890123456789012',
    SESSION_SECRET: '12345678901234567890123456789012',
  });
}

describe('OIDC authentication boundary', () => {
  it('fails closed when OIDC is disabled', async () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    const adapter = new OidcAdapter(config, {} as never, async () => new Response());

    await expect(adapter.start('/')).rejects.toMatchObject({ code: 'OIDC_DISABLED', statusCode: 503 });
  });

  it('rejects open redirects and produces PKCE state for safe return paths', async () => {
    const config = oidcConfig();
    const fetchImpl = async () => new Response(JSON.stringify({
      issuer: 'https://issuer.example.com',
      authorization_endpoint: 'https://issuer.example.com/authorize',
      token_endpoint: 'https://issuer.example.com/token',
      jwks_uri: 'https://issuer.example.com/jwks',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    const adapter = new OidcAdapter(config, {} as never, fetchImpl);

    await expect(adapter.start('https://evil.example')).rejects.toMatchObject({ code: 'OPEN_REDIRECT_REJECTED' });
    const result = await adapter.start('/applications?tab=mine');
    const url = new URL(result.redirectUrl);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9_.-]+$/);
  });

  it('rejects discovery metadata whose issuer differs from the approved issuer', async () => {
    const config = oidcConfig();
    const fetchImpl = async () => new Response(JSON.stringify({
      issuer: 'https://evil.example.com',
      authorization_endpoint: 'https://issuer.example.com/authorize',
      token_endpoint: 'https://issuer.example.com/token',
      jwks_uri: 'https://issuer.example.com/jwks',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    const adapter = new OidcAdapter(config, {} as never, fetchImpl);

    await expect(adapter.start('/')).rejects.toMatchObject({ code: 'OIDC_DISCOVERY_INVALID' });
  });

  it('rejects issuer, audience, nonce and missing subject mismatches', () => {
    const adapter = new OidcAdapter(oidcConfig(), {} as never, async () => new Response());
    const base = { iss: 'https://issuer.example.com', aud: 'cms-api', nonce: 'nonce', sub: 'subject-1', email: 'staff@example.com' };

    expect(() => adapter.validateClaims(base, 'nonce')).not.toThrow();
    expect(() => adapter.validateClaims({ ...base, iss: 'https://evil.example.com' }, 'nonce')).toThrow(OidcValidationError);
    expect(() => adapter.validateClaims({ ...base, aud: 'other-api' }, 'nonce')).toThrow(/audience/i);
    expect(() => adapter.validateClaims(base, 'different')).toThrow(/nonce/i);
    expect(() => adapter.validateClaims({ ...base, sub: '' }, 'nonce')).toThrow(/subject/i);
  });

  it('rejects malformed callback state and missing CSRF before any provider call', async () => {
    const adapter = new OidcAdapter(oidcConfig(), {} as never, async () => new Response());
    await expect(adapter.complete('authorization-code', 'malformed-state')).rejects.toMatchObject({ code: 'OIDC_STATE_INVALID' });

    const service = new SessionService(oidcConfig(), {} as never);
    expect(() => service.assertCsrf({} as never, undefined)).toThrow(CsrfViolationError);
  });

  it('does not create a session for a deactivated user', async () => {
    const audit = { append: vi.fn() };
    const prisma = {
      user: { findUnique: async () => ({ id: 'disabled-user', displayName: 'Disabled', email: 'disabled@example.invalid', status: 'DISABLED' }) },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
    };
    const service = new SessionService(oidcConfig(), prisma as never, audit as never);
    await expect(service.createSession('disabled-user')).rejects.toMatchObject({ statusCode: 401 });
    expect(audit.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: 'AUTH_LOGIN_FAILED',
      metadataJson: { reason: 'USER_NOT_ACTIVE' },
    }));
  });

  const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);
  const database = liveDatabase
    ? new PrismaService(loadConfig({ ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL }))
    : null;

  beforeAll(async () => {
    if (database) await database.onModuleInit();
  });

  afterAll(async () => {
    if (database) await database.onModuleDestroy();
  });

  it.skipIf(!liveDatabase)('creates, validates, CSRF-checks and revokes an opaque session', async () => {
    const user = await database!.user.create({
      data: { displayName: 'Auth Test', email: `auth-${randomUUID()}@example.invalid`, status: 'ACTIVE' },
    });
    const service = new SessionService(loadConfig({ ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL }), database!);
    const created = await service.createSession(user.id);
    const context = await service.validateSession(created.sessionToken);

    expect(context.userId).toBe(user.id);
    expect(context.sessionHash).not.toContain(created.sessionToken);
    service.assertCsrf(context, created.csrfToken);
    expect(() => service.assertCsrf(context, 'wrong-csrf')).toThrow(CsrfViolationError);
    await service.revokeSession(created.sessionToken);
    await expect(service.validateSession(created.sessionToken)).rejects.toMatchObject({ statusCode: 401 });
  });
});
