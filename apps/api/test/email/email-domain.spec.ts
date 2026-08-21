import { describe, expect, it } from 'vitest';
import { DisabledMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/disabled.adapter.js';
import { FakeMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/fake.adapter.js';
import { assertEmailMessageTransition, assertImmutableEmailMessagePatch } from '../../src/modules/email-hub/domain/email.rules.js';

describe('email hub domain foundation', () => {
  it('allows only explicit outbound state transitions', () => {
    expect(() => assertEmailMessageTransition('QUEUED', 'SENDING')).not.toThrow();
    expect(() => assertEmailMessageTransition('SENT', 'SENDING')).toThrowError(/INVALID_EMAIL_STATUS_TRANSITION/);
  });

  it('rejects body and recipient mutation after send or receive', () => {
    expect(() => assertImmutableEmailMessagePatch(
      { status: 'SENT', bodyText: 'old', recipients: ['candidate@example.test'], subject: 'Subject', fromAddress: 'ops@example.test' },
      { bodyText: 'new' },
    )).toThrowError(/EMAIL_MESSAGE_IMMUTABLE/);
    expect(() => assertImmutableEmailMessagePatch(
      { status: 'RECEIVED', bodyText: 'body', recipients: ['candidate@example.test'], subject: 'Subject', fromAddress: 'candidate@example.test' },
      { to: ['other@example.test'] },
    )).toThrowError(/EMAIL_MESSAGE_IMMUTABLE/);
  });

  it('provides a healthy deterministic fake adapter with idempotent send', async () => {
    const adapter = new FakeMailProviderAdapter();
    await expect(adapter.validateConnection()).resolves.toMatchObject({ status: 'healthy' });
    const input = { from: 'ops@example.test', to: ['candidate@example.test'], subject: 'Hello', bodyText: 'Body' };
    const first = await adapter.send(input, 'email-key-001');
    const replay = await adapter.send(input, 'email-key-001');
    expect(replay).toEqual(first);
    expect(first.providerMessageId).toBeTruthy();
  });

  it('fails closed while the real provider is disabled', async () => {
    const adapter = new DisabledMailProviderAdapter();
    await expect(adapter.validateConnection()).resolves.toMatchObject({ status: 'not_configured' });
    await expect(adapter.send({ from: 'ops@example.test', to: ['candidate@example.test'], subject: 'Hello', bodyText: 'Body' }, 'email-key-002'))
      .rejects.toMatchObject({ code: 'MAIL_PROVIDER_DISABLED' });
  });
});
