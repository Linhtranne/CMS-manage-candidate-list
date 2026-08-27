import { describe, expect, it } from 'vitest';
import { bindMailProvider } from '../../src/modules/email-hub/infrastructure/providers/mail-provider.factory.js';
import { FakeMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/fake.adapter.js';
import { DisabledMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/disabled.adapter.js';
import { NoopMailOperationLimiter } from '../../src/modules/email-hub/infrastructure/providers/mail-provider-rate-limiter.js';
import { SesSmtpMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/ses-smtp.adapter.js';

const config = (provider: 'DISABLED' | 'FAKE' | 'MICROSOFT_GRAPH' | 'SMTP_IMAP', enabled = provider !== 'DISABLED') => ({
  mail: {
    provider,
    mode: 'NOTIFICATION_ONLY' as const,
    senderAddress: null,
    enabled,
    approved: enabled,
    approvalFile: null,
    canaryOnly: false,
    canaryRecipients: [] as string[],
    operationalPolicy: enabled ? { ratePerMinute: 60, burst: 10, maxConcurrency: 5, maxAttempts: 8, retryWindowSeconds: 86400 } : null,
    smtp: { endpoint: null, port: 587, secure: false, username: null, password: null },
  },
});

describe('runtime mail provider binding', () => {
  it('binds disabled mode to the fail-closed adapter', () => {
    const disabled = new DisabledMailProviderAdapter();
    expect(bindMailProvider(config('DISABLED'), disabled, new NoopMailOperationLimiter())).toBe(disabled);
  });

  it('binds the synthetic fake provider without an external approval record', async () => {
    const runtime = config('FAKE');
    const fake = new FakeMailProviderAdapter();
    const bound = bindMailProvider(runtime, new DisabledMailProviderAdapter(), new NoopMailOperationLimiter(), fake);

    expect(bound.provider).toBe('FAKE');
    await expect(bound.validateConnection()).resolves.toMatchObject({ provider: 'FAKE', status: 'healthy' });
  });

  it('refuses an enabled provider when no concrete delegate is wired', () => {
    expect(() => bindMailProvider(config('MICROSOFT_GRAPH'), new DisabledMailProviderAdapter(), new NoopMailOperationLimiter())).toThrow('MAIL_PROVIDER_ADAPTER_NOT_BOUND');
  });

  it('refuses an enabled provider when the approved operational policy is missing', () => {
    const runtime = config('MICROSOFT_GRAPH');
    runtime.mail.operationalPolicy = null;
    const delegate = Object.assign(new FakeMailProviderAdapter(), { provider: 'MICROSOFT_GRAPH' as const });
    expect(() => bindMailProvider(runtime, new DisabledMailProviderAdapter(), new NoopMailOperationLimiter(), delegate)).toThrow('MAIL_PROVIDER_OPERATIONAL_POLICY_REQUIRED');
  });

  it('wraps a correctly selected delegate with the approval gate', async () => {
    const runtime = config('MICROSOFT_GRAPH');
    const delegate = Object.assign(new FakeMailProviderAdapter(), { provider: 'MICROSOFT_GRAPH' as const });
    const bound = bindMailProvider(runtime, new DisabledMailProviderAdapter(), new NoopMailOperationLimiter(), delegate);
    expect(bound.provider).toBe('MICROSOFT_GRAPH');
    runtime.mail.approved = false;
    await expect(bound.validateConnection()).rejects.toThrow('MAIL_PROVIDER_APPROVAL_REQUIRED');
  });

  it('binds the approved SES SMTP adapter under the canonical SMTP_IMAP contract', async () => {
    const runtime = config('SMTP_IMAP');
    const delegate = new SesSmtpMailProviderAdapter({ endpoint: 'email-smtp.ap-southeast-2.amazonaws.com', port: 587, secure: false, username: 'smtp-user', password: 'smtp-password' }, { verify: async () => undefined, sendMail: async () => ({ messageId: '<message@example.com>' }) });
    const bound = bindMailProvider(runtime, new DisabledMailProviderAdapter(), new NoopMailOperationLimiter(), delegate);
    expect(bound.provider).toBe('SMTP_IMAP');
    await expect(bound.validateConnection()).resolves.toMatchObject({ provider: 'SMTP_IMAP', status: 'healthy' });
  });

  it('enforces the staging canary list before delegating a send', async () => {
    const runtime = config('MICROSOFT_GRAPH');
    runtime.mail.canaryOnly = true;
    runtime.mail.canaryRecipients = ['canary@example.test'];
    const delegate = Object.assign(new FakeMailProviderAdapter(), { provider: 'MICROSOFT_GRAPH' as const });
    const bound = bindMailProvider(runtime, new DisabledMailProviderAdapter(), new NoopMailOperationLimiter(), delegate);
    await expect(bound.send({ from: 'ops@example.test', to: ['canary@example.test'], subject: 'Subject', bodyText: 'Body' }, 'canary-key')).resolves.toBeTruthy();
    await expect(bound.send({ from: 'ops@example.test', to: ['outside@example.test'], subject: 'Subject', bodyText: 'Body' }, 'outside-key')).rejects.toThrow('EMAIL_CANARY_RECIPIENT_NOT_ALLOWED');
  });
});
