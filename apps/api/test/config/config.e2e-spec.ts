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
    expect(config.mail.smtp).toMatchObject({ endpoint: null, port: 587, secure: false, username: null, password: null });
  });

  it('allows the synthetic fake provider only in local test environments', () => {
    const config = loadConfig(productionEnv({ NODE_ENV: 'test', MAIL_PROVIDER: 'FAKE' }));

    expect(config.mail).toMatchObject({ provider: 'FAKE', mode: 'NOTIFICATION_ONLY', senderAddress: null, enabled: true, approved: true, operationalPolicy: { maxAttempts: 3 } });
    expect(() => loadConfig(productionEnv({ MAIL_PROVIDER: 'FAKE' }))).toThrow(/MAIL_PROVIDER/);
  });

  it('supports one-way notification mode with an explicit sender address', () => {
    const config = loadConfig(productionEnv({
      NODE_ENV: 'test',
      MAIL_PROVIDER: 'FAKE',
      MAIL_MODE: 'NOTIFICATION_ONLY',
      MAIL_SENDER_ADDRESS: 'noreply@company.vn',
    }));

    expect(config.mail).toMatchObject({ mode: 'NOTIFICATION_ONLY', senderAddress: 'noreply@company.vn' });
    expect(() => loadConfig(productionEnv({ NODE_ENV: 'test', MAIL_PROVIDER: 'FAKE', MAIL_MODE: 'unknown' }))).toThrow(/MAIL_MODE/);
    expect(() => loadConfig(productionEnv({ NODE_ENV: 'test', MAIL_PROVIDER: 'FAKE', MAIL_SENDER_ADDRESS: 'not-an-email' }))).toThrow(/MAIL_SENDER_ADDRESS/);
  });

  it('enables a mail provider only with a scoped DEC-003 approval', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-003-'));
    const file = join(directory, 'dec-003.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-003', status: 'approved', version: '1.0.0', scope: 'staging-and-production', provider: 'MICROSOFT_GRAPH', artifact_checksum: `sha256:${'b'.repeat(64)}`,
      sandbox_endpoint: 'https://sandbox.example.com', canary_recipients: ['qa@example.com'],
      operational_policy: { rate_per_minute: 60, burst: 10, max_concurrency: 5, max_attempts: 8, retry_window_seconds: 86400 },
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));
    try {
      const config = loadConfig(productionEnv({ MAIL_PROVIDER: 'MICROSOFT_GRAPH', MAIL_PROVIDER_APPROVAL_RECORD_FILE: file }));
      expect(config.mail).toMatchObject({ provider: 'MICROSOFT_GRAPH', enabled: true, approved: true, operationalPolicy: { ratePerMinute: 60, burst: 10, maxConcurrency: 5, maxAttempts: 8, retryWindowSeconds: 86400 } });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('requires SES SMTP settings when an approved SMTP_IMAP provider is enabled', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-003-smtp-'));
    const file = join(directory, 'dec-003.json');
    const secretFile = join(directory, 'smtp-password');
    writeFileSync(secretFile, 'smtp-password\n');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-003', status: 'approved', version: '1.0.0', scope: 'staging-and-production', provider: 'SMTP_IMAP', artifact_checksum: `sha256:${'e'.repeat(64)}`,
      sandbox_endpoint: 'https://sandbox.example.com', canary_recipients: ['qa@example.com'],
      operational_policy: { rate_per_minute: 60, burst: 10, max_concurrency: 5, max_attempts: 8, retry_window_seconds: 86400 },
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));
    try {
      expect(() => loadConfig(productionEnv({ MAIL_PROVIDER: 'SMTP_IMAP', MAIL_PROVIDER_APPROVAL_RECORD_FILE: file }))).toThrow(/SES_SMTP_ENDPOINT|SES_SMTP_USERNAME|SES_SMTP_PASSWORD/);
      const config = loadConfig(productionEnv({
        MAIL_PROVIDER: 'SMTP_IMAP',
        MAIL_PROVIDER_APPROVAL_RECORD_FILE: file,
        SES_SMTP_ENDPOINT: 'email-smtp.ap-southeast-2.amazonaws.com',
        SES_SMTP_PORT: '587',
        SES_SMTP_SECURE: 'false',
        SES_SMTP_USERNAME: 'smtp-user',
        SES_SMTP_PASSWORD_FILE: secretFile,
      }));
      expect(config.mail).toMatchObject({ provider: 'SMTP_IMAP', enabled: true, smtp: { endpoint: 'email-smtp.ap-southeast-2.amazonaws.com', port: 587, secure: false, username: 'smtp-user', password: 'smtp-password' } });
      try {
        loadConfig(productionEnv({
          MAIL_PROVIDER: 'SMTP_IMAP',
          MAIL_PROVIDER_APPROVAL_RECORD_FILE: file,
          SES_SMTP_ENDPOINT: 'email-smtp.ap-southeast-2.amazonaws.com',
          SES_SMTP_USERNAME: 'smtp-user',
          SES_SMTP_PASSWORD: 'raw-password',
          SES_SMTP_PASSWORD_FILE: secretFile,
        }));
        throw new Error('expected raw SMTP password rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).issues.some((item) => item.message.includes('raw SMTP passwords'))).toBe(true);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('requires and normalizes a staging canary recipient allowlist', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-003-canary-'));
    const file = join(directory, 'dec-003.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-003', status: 'approved', version: '1.0.0', scope: 'staging-and-production', provider: 'MICROSOFT_GRAPH', artifact_checksum: `sha256:${'c'.repeat(64)}`,
      sandbox_endpoint: 'https://sandbox.example.com', canary_recipients: ['qa@example.com'],
      operational_policy: { rate_per_minute: 60, burst: 10, max_concurrency: 5, max_attempts: 8, retry_window_seconds: 86400 },
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));
    try {
      const base = productionEnv({ NODE_ENV: 'staging', MAIL_PROVIDER: 'MICROSOFT_GRAPH', MAIL_PROVIDER_APPROVAL_RECORD_FILE: file });
      const config = loadConfig({ ...base, MAIL_CANARY_RECIPIENTS: ' QA@example.com,qa@example.com ' });
      expect(config.mail).toMatchObject({ canaryOnly: true, canaryRecipients: ['qa@example.com'] });
      expect(() => loadConfig(base)).toThrow(/MAIL_CANARY_RECIPIENTS/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an enabled mail provider without DEC-003 approval', () => {
    expect(() => loadConfig(productionEnv({ MAIL_PROVIDER: 'MICROSOFT_GRAPH' }))).toThrow(/MAIL_PROVIDER_APPROVAL_RECORD_FILE/);
  });

  it('rejects DEC-003 without an approved operational policy and sandbox endpoint', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-003-policy-'));
    const file = join(directory, 'dec-003.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-003', status: 'approved', version: '1.0.0', scope: 'staging-and-production', provider: 'MICROSOFT_GRAPH', artifact_checksum: `sha256:${'d'.repeat(64)}`,
      approvals: [
        { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));
    try {
      try {
        loadConfig(productionEnv({ MAIL_PROVIDER: 'MICROSOFT_GRAPH', MAIL_PROVIDER_APPROVAL_RECORD_FILE: file }));
        throw new Error('expected DEC-003 policy validation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect((error as ConfigValidationError).issues.some((item) => item.message.includes('operational_policy'))).toBe(true);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each(['MICROSOFT_365', 'GOOGLE_WORKSPACE'])('rejects legacy provider identifier %s', (provider) => {
    expect(() => loadConfig(productionEnv({ MAIL_PROVIDER: provider }))).toThrow(/MAIL_PROVIDER/);
  });

  it('allows queue transport configuration and defers handler completeness to worker bootstrap', () => {
    expect(loadConfig(productionEnv()).queue.enabled).toBe(false);
    expect(loadConfig(productionEnv({ QUEUE_ENABLED: 'true' })).queue.enabled).toBe(true);
  });

  it('keeps high-risk activation gates disabled by default', () => {
    const config = loadConfig(productionEnv());

    expect(config.activation).toMatchObject({
      catalog: { enabled: false, approved: false },
      documents: { enabled: false, approved: false },
      exports: { enabled: false, approved: false },
      retention: { purgeEnabled: false, approved: false },
      breakGlass: { enabled: false, approved: false },
    });
  });

  it('rejects an enabled export gate without a server-owned DEC-005 approval record', () => {
    expect(() => loadConfig(productionEnv({ BULK_EXPORT_ENABLED: 'true' }))).toThrow(/EXPORT_APPROVAL_RECORD_FILE/);
  });

  it('rejects an activation record with the wrong decision or environment scope', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-activation-invalid-'));
    const file = join(directory, 'activation.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-004', status: 'approved', version: '1.0.0', scope: 'development', artifact_checksum: `sha256:${'e'.repeat(64)}`,
      approvals: [
        { role: 'Privacy/Legal Owner', identity: 'privacy@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));

    try {
      expect(() => loadConfig(productionEnv({ BULK_EXPORT_ENABLED: 'true', EXPORT_APPROVAL_RECORD_FILE: file }))).toThrow(/EXPORT_APPROVAL_RECORD_FILE/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('enables export and purge only from valid, scoped DEC-005 approval records', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-activation-valid-'));
    const file = join(directory, 'dec-005.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-005', status: 'approved', version: '1.0.0', scope: 'staging-and-production', artifact_checksum: `sha256:${'f'.repeat(64)}`,
      approvals: [
        { role: 'Privacy/Legal Owner', identity: 'privacy@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));

    try {
      const config = loadConfig(productionEnv({
        BULK_EXPORT_ENABLED: 'true',
        PURGE_ENABLED: 'true',
        EXPORT_APPROVAL_RECORD_FILE: file,
        RETENTION_APPROVAL_RECORD_FILE: file,
      }));
      expect(config.activation.exports).toMatchObject({ enabled: true, approved: true, approvalRecordFile: file });
      expect(config.activation.retention).toMatchObject({ purgeEnabled: true, approved: true, approvalRecordFile: file });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
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
