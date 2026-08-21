import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigValidationError, loadConfig } from '../../src/platform/config/config.schema.js';

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://cms.example.com',
    DATABASE_URL: 'postgresql://cms:secret@db.example.com:5432/cms',
    REDIS_URL: 'redis://redis.example.com:6379',
    OIDC_ISSUER: 'https://login.example.com',
    OIDC_CLIENT_ID: 'cms-client',
    OIDC_CLIENT_SECRET: 'oidc-secret',
    OIDC_REDIRECT_URI: 'https://cms.example.com/api/v1/auth/oidc/callback',
    OIDC_AUDIENCE: 'cms-api',
    ENCRYPTION_KEY: '12345678901234567890123456789012',
    SESSION_SECRET: '12345678901234567890123456789012',
    MAIL_PROVIDER: 'DISABLED',
    ...overrides
  };
}

describe('runtime configuration', () => {
  it('keeps production OIDC disabled until a valid DEC-002 approval record exists', () => {
    expect(loadConfig(productionEnv({
      OIDC_ISSUER: undefined,
      OIDC_CLIENT_ID: undefined,
      OIDC_CLIENT_SECRET: undefined,
      OIDC_REDIRECT_URI: undefined,
      OIDC_AUDIENCE: undefined,
    })).oidc.enabled).toBe(false);
    expect(loadConfig(productionEnv()).oidc.enabled).toBe(false);
  });

  it('fails closed when production encryption or session settings are missing', () => {
    expect(() => loadConfig(productionEnv({ ENCRYPTION_KEY: undefined }))).toThrow(ConfigValidationError);
    expect(() => loadConfig(productionEnv({ SESSION_SECRET: undefined }))).toThrow(ConfigValidationError);
  });

  it('enables production OIDC only for an approved, scoped, non-placeholder record', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-002-'));
    const file = join(directory, 'dec-002.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-002',
      status: 'approved',
      version: '1.0.0',
      scope: 'staging-and-production',
      artifact_checksum: `sha256:${'a'.repeat(64)}`,
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'IT Identity Owner', identity: 'identity@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));

    try {
      const config = loadConfig(productionEnv({ OIDC_APPROVAL_RECORD_FILE: file }));
      expect(config.oidc.enabled).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an invalid approval record instead of enabling OIDC', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-002-invalid-'));
    const file = join(directory, 'dec-002.json');
    writeFileSync(file, JSON.stringify({ id: 'DEC-001', status: 'approved' }));

    try {
      expect(() => loadConfig(productionEnv({ OIDC_APPROVAL_RECORD_FILE: file }))).toThrow(/OIDC_APPROVAL_RECORD_FILE/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects invalid application and OIDC origins', () => {
    expect(() => loadConfig(productionEnv({ APP_ORIGIN: 'not-a-url' }))).toThrow(/APP_ORIGIN/);
    expect(() => loadConfig(productionEnv({ OIDC_REDIRECT_URI: 'ftp://cms.example.com/callback' }))).toThrow(/OIDC_REDIRECT_URI/);
  });

  it('requires HTTPS for a configured staging/production OIDC issuer', () => {
    expect(() => loadConfig(productionEnv({ OIDC_ISSUER: 'http://login.example.com' }))).toThrow(/OIDC_ISSUER/);
  });

  it('rejects an approval checksum that is not a full SHA-256 digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-002-checksum-'));
    const file = join(directory, 'dec-002.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-002',
      status: 'approved',
      version: '1.0.0',
      scope: 'staging-and-production',
      artifact_checksum: 'sha256:not-a-digest',
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'IT Identity Owner', identity: 'identity@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));

    try {
      expect(() => loadConfig(productionEnv({ OIDC_APPROVAL_RECORD_FILE: file }))).toThrow(/OIDC_APPROVAL_RECORD_FILE/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('allows an explicit disabled mail provider without provider credentials', () => {
    const config = loadConfig(productionEnv({ MAIL_PROVIDER: 'DISABLED' }));

    expect(config.mail.provider).toBe('DISABLED');
    expect(config.mail.enabled).toBe(false);
  });

  it('keeps queue transport disabled until a real consumer is explicitly enabled', () => {
    expect(loadConfig(productionEnv()).queue.enabled).toBe(false);
    expect(() => loadConfig(productionEnv({ QUEUE_ENABLED: 'true' }))).toThrow(/QUEUE_ENABLED/);
  });

  it('keeps database pool and timeout settings bounded', () => {
    const config = loadConfig(productionEnv({
      DB_POOL_MAX: '24',
      DB_CONNECT_TIMEOUT_MS: '3000',
      DB_STATEMENT_TIMEOUT_MS: '15000',
    }));

    expect(config.database).toMatchObject({ poolMax: 24, connectTimeoutMs: 3000, statementTimeoutMs: 15000 });
    expect(() => loadConfig(productionEnv({ DB_POOL_MAX: '0' }))).toThrow(/DB_POOL_MAX/);
    expect(() => loadConfig(productionEnv({ DB_STATEMENT_TIMEOUT_MS: 'not-a-number' }))).toThrow(/DB_STATEMENT_TIMEOUT_MS/);
  });

  it('reports all invalid fields in one typed validation error', () => {
    try {
      loadConfig(productionEnv({ APP_ORIGIN: 'bad', REDIS_URL: 'bad', SESSION_SECRET: 'short' }));
      throw new Error('expected loadConfig to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).issues.map((issue) => issue.field)).toEqual([
        'APP_ORIGIN', 'REDIS_URL', 'SESSION_SECRET'
      ]);
    }
  });
});
