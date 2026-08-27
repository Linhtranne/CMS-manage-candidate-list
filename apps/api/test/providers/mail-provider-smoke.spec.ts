import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runProviderSmoke, validateApproval, validateSmokeUrl } from '../../scripts/mail-provider-smoke.mjs';

const approval = {
  id: 'DEC-003',
  status: 'approved',
  version: '1.0.0',
  provider: 'GMAIL_API',
  artifact_checksum: `sha256:${'a'.repeat(64)}`,
  scope: ['staging-and-production'],
  approvals: [
    { role: 'Security Owner', identity: 'security@example.com', at: '2026-08-24T00:00:00Z' },
    { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-24T00:00:00Z' },
  ],
  sandbox_endpoint: 'https://sandbox.example.com/health',
  canary_recipients: ['qa@example.com'],
  operational_policy: {
    rate_per_minute: 60,
    burst: 10,
    max_concurrency: 5,
    max_attempts: 8,
    retry_window_seconds: 86400,
  },
};

describe('mail provider smoke approval gate', () => {
  it('requires the full DEC-003 operational record', () => {
    expect(validateApproval(approval, { provider: 'GMAIL_API', scope: 'staging' })).toBe(true);
    expect(validateApproval({ ...approval, operational_policy: undefined }, { provider: 'GMAIL_API', scope: 'staging' })).toBe(false);
    expect(validateApproval({ ...approval, canary_recipients: [] }, { provider: 'GMAIL_API', scope: 'staging' })).toBe(false);
  });

  it('requires HTTPS and an approved sandbox origin outside development', () => {
    expect(validateSmokeUrl(approval.sandbox_endpoint, 'https://sandbox.example.com/provider-health', 'staging')).toBe(true);
    expect(validateSmokeUrl(approval.sandbox_endpoint, 'https://other.example.com/health', 'staging')).toBe(false);
    expect(validateSmokeUrl('http://sandbox.example.com/health', 'http://sandbox.example.com/health', 'staging')).toBe(false);
  });

  it('supports a local synthetic smoke without DEC-003', async () => {
    await expect(runProviderSmoke({ MAIL_PROVIDER: 'FAKE', NODE_ENV: 'test' })).resolves.toMatchObject({ ok: true, provider: 'FAKE' });
    await expect(runProviderSmoke({ MAIL_PROVIDER: 'FAKE', NODE_ENV: 'staging' })).resolves.toMatchObject({ blocked: expect.stringContaining('development or test') });
  });

  it('validates SES SMTP runtime configuration without requiring a fictional HTTP sandbox URL', async () => {
    const smtpApproval = { ...approval, provider: 'SMTP_IMAP' };
    const directory = mkdtempSync(join(tmpdir(), 'cms-ses-smoke-'));
    const file = join(directory, 'dec-003.json');
    writeFileSync(file, JSON.stringify(smtpApproval));
    try {
      await expect(runProviderSmoke({
        MAIL_PROVIDER: 'SMTP_IMAP',
        NODE_ENV: 'test',
        MAIL_PROVIDER_APPROVAL_RECORD_FILE: file,
        SES_SMTP_ENDPOINT: 'email-smtp.ap-southeast-2.amazonaws.com',
        SES_SMTP_PORT: '587',
        SES_SMTP_USERNAME: 'smtp-user',
        SES_SMTP_PASSWORD: 'smtp-password',
      })).resolves.toMatchObject({ ok: true, provider: 'SMTP_IMAP', transport: 'smtp' });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
