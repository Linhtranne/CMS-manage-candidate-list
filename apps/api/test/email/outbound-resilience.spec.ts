import { describe, expect, it, vi } from 'vitest';
import { EmailPreviewService } from '../../src/modules/email-hub/application/email-preview.service.js';
import { classifySendFailure, SendEmailProcessor } from '../../src/modules/email-hub/workers/send-email.processor.js';
import { EmailCommandService } from '../../src/modules/email-hub/application/email-command.service.js';
import { ReconcileSendProcessor } from '../../src/modules/email-hub/workers/reconcile-send.processor.js';

const request = {
  mailboxId: '00000000-0000-0000-0000-000000000001',
  from: 'ops@example.test',
  recipients: [{ kind: 'TO' as const, address: 'candidate@example.test' }],
  subject: 'Interview update',
  bodyText: 'Please choose a slot.',
  templateChecksum: 'template-v1',
};

describe('email outbound resilience', () => {
  it('rejects expired and tampered preview tokens', () => {
    let now = new Date('2026-08-20T00:00:00.000Z');
    const previews = new EmailPreviewService('test-preview-secret', () => now);
    const created = previews.create(request);
    expect(previews.verify(created.token)).toMatchObject({ mailboxId: request.mailboxId });

    expect(() => previews.verify(`${created.token.slice(0, -1)}x`)).toThrowError(/EMAIL_PREVIEW_TAMPERED/);
    now = new Date('2026-08-20T00:16:00.000Z');
    expect(() => previews.verify(created.token)).toThrowError(/EMAIL_PREVIEW_EXPIRED/);
  });

  it('fails closed for do-not-contact and unsafe attachments', () => {
    const previews = new EmailPreviewService('test-preview-secret');
    expect(() => previews.create({ ...request, candidate: { id: 'candidate-1', contactabilityStatus: 'DO_NOT_CONTACT' } }))
      .toThrowError(/DO_NOT_CONTACT/);
    expect(() => previews.create({ ...request, attachments: [{ id: 'att-1', status: 'PENDING' }] }))
      .toThrowError(/ATTACHMENT_NOT_SAFE/);
    expect(() => previews.create({ ...request, templateCandidates: [
      { id: 'journey-a', specificity: 'JOURNEY', active: true, applicable: true, checksum: 'a' },
      { id: 'journey-b', specificity: 'JOURNEY', active: true, applicable: true, checksum: 'b' },
    ] })).toThrowError(/EMAIL_TEMPLATE_AMBIGUOUS/);
    expect(previews.create({ ...request, templateChecksum: undefined, templateCandidates: [
      { id: 'global', specificity: 'GLOBAL', active: true, applicable: true, checksum: 'global' },
      { id: 'occupation', specificity: 'OCCUPATION', active: true, applicable: true, checksum: 'occupation' },
    ] })).toMatchObject({ templateChecksum: 'occupation' });
  });

  it('binds enqueue payload to the signed preview', () => {
    const previews = new EmailPreviewService('test-preview-secret');
    const created = previews.create(request);
    expect(() => previews.assertMatches(created.token, { ...request, bodyText: 'changed' })).toThrowError(/EMAIL_PREVIEW_MISMATCH/);
    expect(() => previews.assertMatches(created.token, request)).not.toThrow();
  });

  it('uses the mailbox address as the only preview From identity', async () => {
    const previews = { create: vi.fn().mockReturnValue({ token: 'signed-preview', previewId: 'preview-1' }) };
    const repository = { findMailbox: vi.fn().mockResolvedValue({ id: request.mailboxId, address: 'shared@example.test' }) };
    const command = new EmailCommandService(previews as never, repository as never, {} as never, {} as never, {} as never);

    await command.preview({ ...request, from: 'attacker@example.test' }, { actorId: 'user-1', correlationId: 'corr-preview' });
    expect(previews.create).toHaveBeenCalledWith(expect.objectContaining({ from: 'shared@example.test' }));
    expect(previews.create).not.toHaveBeenCalledWith(expect.objectContaining({ from: 'attacker@example.test' }));
  });

  it('classifies uncertain provider failures as reconciling, not retry', () => {
    expect(classifySendFailure(new Error('ETIMEDOUT after request accepted'))).toEqual('RECONCILING');
    expect(classifySendFailure(Object.assign(new Error('HTTP 429'), { code: 'RATE_LIMITED' }))).toEqual('RETRY_WAIT');
    expect(classifySendFailure(Object.assign(new Error('invalid credential'), { code: 'AUTH_INVALID' }))).toEqual('FAILED');
    const previews = new EmailPreviewService('test-preview-secret');
    expect(() => previews.create({ ...request, headers: { 'Auto-Submitted': 'auto-replied' } })).toThrowError(/EMAIL_AUTO_REPLY_LOOP/);
  });

  it('does not call the provider twice when the DB claim is lost', async () => {
    const provider = { send: vi.fn() };
    const repository = {
      findMessageForSend: vi.fn().mockResolvedValue({ status: 'QUEUED', mailbox: { status: 'HEALTHY' }, conversation: { candidate: null } }),
      claimForSend: vi.fn().mockResolvedValue(false),
    };
    const processor = new SendEmailProcessor(repository as never, provider as never, {} as never);
    await processor.handle({ schemaVersion: 1, eventId: 'event-1', correlationId: 'corr-1', entityId: 'message-1', messageId: 'message-1' });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('moves an accepted-but-uncertain send to RECONCILING and never retries blindly', async () => {
    const provider = { send: vi.fn().mockRejectedValue(new Error('ETIMEDOUT after request accepted')) };
    const markSendState = vi.fn().mockResolvedValue(true);
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-uncertain' }) };
    const repository = {
      findMessageForSend: vi.fn().mockResolvedValue({ id: 'message-1', status: 'QUEUED', mailboxId: 'mailbox-1', conversationId: 'conversation-1', mailbox: { status: 'HEALTHY' }, conversation: { candidate: null }, recipients: [{ kind: 'TO', address: 'candidate@example.test', position: 0 }], fromAddress: 'ops@example.test', subject: 'Subject', bodyText: 'Body', sanitizedHtml: null }),
      claimForSend: vi.fn().mockResolvedValue(true),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work({ markSendState }, {})),
    };
    const processor = new SendEmailProcessor(repository as never, provider as never, outbox as never);
    await processor.handle({ schemaVersion: 1, eventId: 'event-uncertain', correlationId: 'corr-1', entityId: 'message-1', messageId: 'message-1' });
    expect(markSendState).toHaveBeenCalledWith('message-1', 'SENDING', 'RECONCILING');
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(outbox.append).toHaveBeenCalledWith({}, expect.objectContaining({ eventType: 'email.send.uncertain' }));
  });

  it('leaves queued work untouched while the mailbox kill switch is active', async () => {
    const provider = { send: vi.fn() };
    const repository = {
      findMessageForSend: vi.fn().mockResolvedValue({ status: 'QUEUED', mailbox: { status: 'PAUSED_OPERATOR' }, conversation: { candidate: null } }),
      claimForSend: vi.fn(),
    };
    const processor = new SendEmailProcessor(repository as never, provider as never, {} as never);
    await processor.handle({ schemaVersion: 1, eventId: 'event-paused', correlationId: 'corr-1', entityId: 'message-1' });
    expect(repository.claimForSend).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('reconciles a provider-accepted message before allowing retry', async () => {
    const provider = { findByClientReference: vi.fn().mockResolvedValue({ providerMessageId: 'provider-1', acceptedAt: new Date('2026-08-20T00:00:00.000Z') }) };
    const markReconciledSent = vi.fn().mockResolvedValue(true);
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-reconciled' }) };
    const repository = {
      findMessageForSend: vi.fn().mockResolvedValue({ id: 'message-1', status: 'RECONCILING', mailboxId: 'mailbox-1', conversationId: 'conversation-1' }),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work({ markReconciledSent }, {})),
    };
    const processor = new ReconcileSendProcessor(repository as never, provider as never, outbox as never);
    await processor.handle({ schemaVersion: 1, eventId: 'event-reconcile', correlationId: 'corr-1', entityId: 'message-1' });
    expect(markReconciledSent).toHaveBeenCalledWith('message-1', expect.objectContaining({ providerMessageId: 'provider-1' }));
    expect(outbox.append).toHaveBeenCalledWith({}, expect.objectContaining({ eventType: 'email.sent' }));
  });

  it('enqueues an immutable message and an ID-only outbox event in one command', async () => {
    const previews = new EmailPreviewService('test-preview-secret');
    const preview = previews.create(request);
    const tx = {};
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({
        findMailbox: vi.fn().mockResolvedValue({ id: request.mailboxId, address: request.from, provider: 'FAKE', status: 'HEALTHY' }),
        createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', mailboxId: request.mailboxId }),
        createMessage: vi.fn().mockResolvedValue({ id: 'message-1', status: 'QUEUED', sentOrReceivedAt: new Date('2026-08-20T00:00:00.000Z') }),
        touchConversationOutbound: vi.fn().mockResolvedValue({}),
      }, tx)),
    };
    const idempotency = { runIdempotent: vi.fn(async (_key: string, _hash: string, work: () => Promise<unknown>) => work()) };
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-1' }) };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-1' }) };
    const command = new EmailCommandService(previews, repository as never, idempotency as never, outbox as never, audit as never);
    const result = await command.enqueue({ ...request, previewToken: preview.token, idempotencyKey: 'email-key-001' }, { actorId: 'user-1', correlationId: 'corr-1' });
    expect(result).toMatchObject({ messageId: 'message-1', status: 'QUEUED' });
    expect(outbox.append).toHaveBeenCalledWith(tx, expect.objectContaining({ eventType: 'email.send.requested', payload: { messageId: 'message-1', mailboxId: request.mailboxId, conversationId: 'conversation-1' } }));
    expect(JSON.stringify(outbox.append.mock.calls[0][1])).not.toContain('candidate@example.test');
    expect(audit.append).toHaveBeenCalled();
  });

  it('cancels only pre-send work and records an ID-only cancellation event', async () => {
    const cancelBeforeSend = vi.fn().mockResolvedValue(true);
    const findMessageForSend = vi.fn().mockResolvedValue({
      id: 'message-cancel',
      direction: 'OUTBOUND',
      status: 'QUEUED',
      mailboxId: 'mailbox-1',
      conversationId: 'conversation-1',
      mailbox: { status: 'HEALTHY' },
      conversation: { candidate: null },
    });
    const findMessage = vi.fn().mockResolvedValue({ id: 'message-cancel', status: 'CANCELLED' });
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({ cancelBeforeSend, findMessageForSend, findMessage }, {})),
    };
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-cancel' }) };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-cancel' }) };
    const command = new EmailCommandService({} as never, repository as never, {} as never, outbox as never, audit as never);

    await expect(command.cancel('message-cancel', { actorId: 'user-1', correlationId: 'corr-1', reason: 'operator requested' })).resolves.toMatchObject({ id: 'message-cancel', status: 'CANCELLED' });
    expect(cancelBeforeSend).toHaveBeenCalledWith('message-cancel');
    expect(outbox.append).toHaveBeenCalledWith({}, expect.objectContaining({ eventType: 'email.cancelled', payload: { messageId: 'message-cancel', mailboxId: 'mailbox-1', conversationId: 'conversation-1' } }));
    expect(JSON.stringify(outbox.append.mock.calls[0][1])).not.toContain('candidate@example.test');
    expect(audit.append).toHaveBeenCalledWith({}, expect.objectContaining({ action: 'EMAIL_CANCELLED', entityId: 'message-cancel' }));
  });

  it('retries FAILED work but refuses to retry an uncertain RECONCILING outcome', async () => {
    const retryFailed = vi.fn().mockResolvedValue(true);
    const findMessageForSend = vi.fn().mockResolvedValue({
      id: 'message-retry',
      direction: 'OUTBOUND',
      status: 'FAILED',
      mailboxId: 'mailbox-1',
      conversationId: 'conversation-1',
      mailbox: { status: 'HEALTHY' },
      conversation: { candidate: null },
    });
    const findMessage = vi.fn().mockResolvedValue({ id: 'message-retry', status: 'QUEUED' });
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({ retryFailed, findMessageForSend, findMessage }, {})),
    };
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-retry' }) };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-retry' }) };
    const command = new EmailCommandService({} as never, repository as never, {} as never, outbox as never, audit as never);

    await expect(command.retry('message-retry', { actorId: 'user-1', correlationId: 'corr-1' })).resolves.toMatchObject({ id: 'message-retry', status: 'QUEUED' });
    expect(retryFailed).toHaveBeenCalledWith('message-retry');
    expect(outbox.append).toHaveBeenCalledWith({}, expect.objectContaining({ eventType: 'email.send.requested', payload: { messageId: 'message-retry', mailboxId: 'mailbox-1', conversationId: 'conversation-1' } }));

    findMessageForSend.mockResolvedValueOnce({
      id: 'message-uncertain',
      direction: 'OUTBOUND',
      status: 'RECONCILING',
      mailboxId: 'mailbox-1',
      conversationId: 'conversation-1',
      mailbox: { status: 'HEALTHY', provider: 'FAKE' },
      conversation: { candidate: null },
    });
    await expect(command.retry('message-uncertain', { actorId: 'user-1', correlationId: 'corr-2' })).rejects.toThrow('EMAIL_SEND_UNCERTAIN');
    expect(retryFailed).toHaveBeenCalledTimes(1);
  });

  it('applies the resource policy before mutating a message action', async () => {
    const policy = { assert: vi.fn(() => { throw new Error('FORBIDDEN'); }) };
    const retryFailed = vi.fn();
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({
        findMessageForSend: vi.fn().mockResolvedValue({
          id: 'message-scope', direction: 'OUTBOUND', status: 'FAILED', mailboxId: 'mailbox-1', conversationId: 'conversation-1',
          mailbox: { status: 'HEALTHY', provider: 'FAKE' }, conversation: { candidate: { ownerId: 'owner-2', teamId: 'team-2', contactabilityStatus: 'CONTACTABLE' } },
        }),
        retryFailed,
      }, {})),
    };
    const command = new EmailCommandService({} as never, repository as never, {} as never, {} as never, {} as never, undefined, undefined, policy as never);

    await expect(command.retry('message-scope', { actorId: 'user-1', teamId: 'team-1', roles: [{ code: 'MANAGER' }], correlationId: 'corr-scope' })).rejects.toThrow('FORBIDDEN');
    expect(retryFailed).not.toHaveBeenCalled();
  });

  it('builds a conversation reply from the server-owned mailbox and preserves the version gate', async () => {
    const previews = { create: vi.fn().mockReturnValue({ token: 'signed-preview', previewId: 'preview-1' }) };
    const repository = { findConversationForSend: vi.fn().mockResolvedValue({
      id: 'conversation-send', mailboxId: 'mailbox-1', candidateId: 'candidate-1', applicationId: 'application-1', journeyId: null, version: 7,
      mailbox: { address: 'shared@example.test' }, candidate: { id: 'candidate-1', contactabilityStatus: 'CONTACTABLE' },
    }), findAttachmentsForPreview: vi.fn().mockResolvedValue([]) };
    const command = new EmailCommandService(previews as never, repository as never, {} as never, {} as never, {} as never);
    const enqueue = vi.spyOn(command, 'enqueue').mockResolvedValue({ messageId: 'message-queued', status: 'QUEUED', queuedAt: '2026-08-21T00:00:00.000Z', conversationId: 'conversation-send' });

    await expect(command.sendConversation({ conversationId: 'conversation-send', to: ['candidate@example.test'], subject: 'Reply', body: 'Thanks', idempotencyKey: 'reply-key-001', version: 7 }, { actorId: 'user-1', correlationId: 'corr-1' })).resolves.toMatchObject({ conversationId: 'conversation-send', status: 'QUEUED' });
    expect(previews.create).toHaveBeenCalledWith(expect.objectContaining({ mailboxId: 'mailbox-1', from: 'shared@example.test', conversationId: 'conversation-send', candidateId: 'candidate-1', recipients: [{ kind: 'TO', address: 'candidate@example.test' }] }));
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ previewToken: 'signed-preview', conversationVersion: 7, conversationId: 'conversation-send', from: 'shared@example.test' }), expect.objectContaining({ actorId: 'user-1' }));
  });

  it('persists a draft without creating an outbound outbox event or trusting a client From address', async () => {
    const createMessage = vi.fn().mockResolvedValue({
      id: 'draft-1', direction: 'OUTBOUND', status: 'DRAFT', fromAddress: 'shared@example.test',
      subject: 'Draft', bodyText: 'Body', sentOrReceivedAt: new Date('2026-08-21T00:00:00.000Z'), recipients: [], attachments: [], immutable: true,
    });
    const touchConversationOutbound = vi.fn().mockResolvedValue({});
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work({
        findMailbox: vi.fn().mockResolvedValue({ id: 'mailbox-1', address: 'shared@example.test', provider: 'DISABLED', status: 'NOT_CONFIGURED' }),
        createConversation: vi.fn().mockResolvedValue({ id: 'conversation-draft', mailboxId: 'mailbox-1' }),
        createMessage,
        touchConversationOutbound,
      }, {})),
    };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-draft' }) };
    const outbox = { append: vi.fn() };
    const command = new EmailCommandService({} as never, repository as never, {} as never, outbox as never, audit as never);

    await expect(command.createDraft({ mailboxId: 'mailbox-1', to: ['candidate@example.test'], subject: 'Draft', body: 'Body' }, { actorId: 'user-1', correlationId: 'corr-draft' })).resolves.toMatchObject({ id: 'draft-1', status: 'DRAFT' });
    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT', fromAddress: 'shared@example.test' }));
    expect(touchConversationOutbound).toHaveBeenCalledWith('conversation-draft', expect.objectContaining({ snippet: 'Body' }));
    expect(outbox.append).not.toHaveBeenCalled();
    expect(audit.append).toHaveBeenCalledWith({}, expect.objectContaining({ action: 'EMAIL_DRAFT_CREATED' }));
  });

  it('links an unmatched conversation with CAS, ID-only event and audit', async () => {
    const updated = { id: 'conversation-link', mailboxId: 'mailbox-1', candidateId: 'candidate-1', applicationId: null, journeyId: null, subject: 'Subject', snippet: 'Snippet', status: 'MATCHED', lastActivityAt: new Date('2026-08-21T00:00:00.000Z'), messageCount: 1, hasUnreadInbound: true, version: 2 };
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work({
        findConversationForLink: vi.fn().mockResolvedValue({ id: 'conversation-link', mailboxId: 'mailbox-1', candidateId: null, version: 1 }),
        findCandidateForLink: vi.fn().mockResolvedValue({ id: 'candidate-1', ownerId: 'user-1', teamId: 'team-1', recordStatus: 'ACTIVE' }),
        linkConversationCandidateCas: vi.fn().mockResolvedValue(true),
        findConversationSummary: vi.fn().mockResolvedValue(updated),
      }, {})),
    };
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-link' }) };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-link' }) };
    const policy = { assert: vi.fn() };
    const command = new EmailCommandService({} as never, repository as never, {} as never, outbox as never, audit as never, undefined, undefined, policy as never);

    await expect(command.linkConversation('conversation-link', { candidateId: 'candidate-1', version: 1 }, { actorId: 'user-1', teamId: 'team-1', roles: [{ code: 'MANAGER' }], correlationId: 'corr-link' })).resolves.toEqual(updated);
    expect(policy.assert).toHaveBeenCalledWith(expect.objectContaining({ action: 'email.manual_link', resource: { ownerUserId: 'user-1', teamId: 'team-1' } }));
    expect(outbox.append).toHaveBeenCalledWith({}, expect.objectContaining({ eventType: 'email.match.resolved', payload: { conversationId: 'conversation-link', candidateId: 'candidate-1' } }));
    expect(JSON.stringify(outbox.append.mock.calls[0][1])).not.toContain('candidate@example.test');
    expect(audit.append).toHaveBeenCalledWith({}, expect.objectContaining({ action: 'EMAIL_MATCH_RESOLVED', entityId: 'conversation-link' }));
  });
});
