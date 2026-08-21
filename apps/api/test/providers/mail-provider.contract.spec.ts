import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { ApprovedMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/approved-mail-provider.adapter.js';
import { DisabledMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/disabled.adapter.js';
import { FakeMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/fake.adapter.js';

describe('mail provider adapter contract', () => {
  it('fake adapter is idempotent and supports fetch/attachment operations', async () => {
    const provider = new FakeMailProviderAdapter();
    const input = { from: 'ops@example.test', to: ['candidate@example.test'], subject: 'Subject', bodyText: 'Body' };
    const first = await provider.send(input, 'client-ref-1');
    const second = await provider.send(input, 'client-ref-1');
    expect(second).toEqual(first);
    const page = await provider.fetchChanges(null, 10);
    expect(page.changes).toHaveLength(1);
    await expect(provider.fetchMessage(first.providerMessageId)).resolves.toMatchObject({ providerMessageId: first.providerMessageId });
    await expect(provider.fetchAttachment(first.providerMessageId, 'attachment-1')).resolves.toBeInstanceOf(Readable);
  });

  it('disabled adapter rejects every external operation', async () => {
    const provider = new DisabledMailProviderAdapter();
    await expect(provider.send({ from: 'ops@example.test', to: ['candidate@example.test'], subject: 'Subject', bodyText: 'Body' }, 'client-ref-1')).rejects.toThrow('MAIL_PROVIDER_DISABLED');
    await expect(provider.fetchChanges(null, 10)).rejects.toThrow('MAIL_PROVIDER_DISABLED');
    await expect(provider.fetchMessage('provider-message')).rejects.toThrow('MAIL_PROVIDER_DISABLED');
    await expect(provider.fetchAttachment('provider-message', 'attachment')).rejects.toThrow('MAIL_PROVIDER_DISABLED');
  });

  it('approval wrapper fails closed until DEC-003 is approved', async () => {
    const fake = new FakeMailProviderAdapter();
    const blocked = new ApprovedMailProviderAdapter(fake, () => false);
    await expect(blocked.validateConnection()).rejects.toThrow('MAIL_PROVIDER_APPROVAL_REQUIRED');
    const approved = new ApprovedMailProviderAdapter(fake, () => true);
    await expect(approved.validateConnection()).resolves.toMatchObject({ status: 'healthy' });
  });
});
