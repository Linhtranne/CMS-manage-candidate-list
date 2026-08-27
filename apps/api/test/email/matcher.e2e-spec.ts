import { describe, expect, it, vi } from 'vitest';
import { EmailInboundService } from '../../src/modules/email-hub/application/email-inbound.service.js';
import { EmailMatcherService } from '../../src/modules/email-hub/application/email-matcher.service.js';
import { MailSyncProcessor } from '../../src/modules/email-hub/workers/mail-sync.processor.js';

const config = { security: { encryptionKey: 'candidate-secret' } };

describe('email inbound ingest and cursor safety', () => {
  it('persists one received message, match decision and cursor after a committed ingest', async () => {
    const createMessage = vi.fn().mockResolvedValue({ id: 'message-1' });
    const repository = {
      findActiveMatchCandidates: vi.fn().mockResolvedValue([]),
      withTransaction: vi.fn(async (work: (repo: unknown) => Promise<unknown>) => work({
        findInboundMessage: vi.fn().mockResolvedValue(null),
        createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', mailboxId: 'mailbox-1' }),
        createMessage,
        createMatchDecision: vi.fn().mockResolvedValue({ id: 'decision-1' }),
        touchConversation: vi.fn().mockResolvedValue({}),
        advanceMailboxCursor: vi.fn().mockResolvedValue({}),
      })),
    };
    const provider = { fetchMessage: vi.fn().mockResolvedValue({ providerMessageId: 'provider-1', from: 'candidate@example.test', to: ['ops@example.test'], subject: 'Reply', bodyText: 'Hello', bodyHtml: '<p>Hello</p><script>bad()</script>', receivedAt: new Date('2026-08-20T00:00:00.000Z') }) };
    const inbound = new EmailInboundService(repository as never, new EmailMatcherService('reply-secret'), provider as never, config as never, {} as never, {} as never);
    const result = await inbound.ingest({ mailboxId: 'mailbox-1', providerMessageId: 'provider-1', correlationId: 'corr-1', cursor: { value: 'cursor-2', issuedAt: new Date('2026-08-20T00:01:00.000Z') } });
    expect(result).toMatchObject({ duplicate: false, messageId: 'message-1', match: { state: 'UNMATCHED' } });
    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({ sanitizedHtml: '<p>Hello</p>' }));
  });

  it('does not advance a cursor when a page item fails before the page completes', async () => {
    const inbound = { ingest: vi.fn().mockResolvedValueOnce({ duplicate: false }).mockRejectedValueOnce(new Error('FETCH_FAILED')) };
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ status: 'HEALTHY', syncCursor: null, syncCursorIssuedAt: null }),
      advanceMailboxCursor: vi.fn(),
    };
    const provider = { fetchChanges: vi.fn().mockResolvedValue({ changes: [{ providerMessageId: 'one' }, { providerMessageId: 'two' }], nextCursor: { value: 'cursor-2', issuedAt: new Date() } }) };
    const sync = new MailSyncProcessor(repository as never, provider as never, inbound as never);
    await expect(sync.handle({ schemaVersion: 1, eventId: 'sync-1', correlationId: 'corr-1', entityId: 'mailbox-1' })).rejects.toThrow('FETCH_FAILED');
    expect(repository.advanceMailboxCursor).not.toHaveBeenCalled();
  });

  it('applies manual-link resource policy and conversation CAS before resolving a message', async () => {
    const linkConversationCandidateCas = vi.fn().mockResolvedValue(true);
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({
        findMessage: vi.fn().mockResolvedValue({ id: 'message-1', direction: 'INBOUND', conversationId: 'conversation-1' }),
        findConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', candidateId: null, version: 4 }),
        findCandidateForLink: vi.fn().mockResolvedValue({ id: 'candidate-1', ownerId: 'owner-1', teamId: 'team-1', recordStatus: 'ACTIVE' }),
        linkConversationCandidateCas,
        createMatchDecision: vi.fn().mockResolvedValue({ id: 'decision-1' }),
      }, {})),
    };
    const policy = { assert: vi.fn() };
    const audit = { append: vi.fn().mockResolvedValue({ id: 'audit-1' }) };
    const outbox = { append: vi.fn().mockResolvedValue({ id: 'outbox-1' }) };
    const inbound = new EmailInboundService(repository as never, new EmailMatcherService('reply-secret'), {} as never, config as never, audit as never, outbox as never, policy as never);

    await expect(inbound.resolveMatch({
      messageId: 'message-1', candidateId: 'candidate-1', reason: 'Reviewed by coordinator', actorId: 'owner-1', teamId: 'team-1',
      roles: [{ code: 'MANAGER' }], applicationId: 'application-1', correlationId: 'corr-1',
    })).resolves.toMatchObject({ id: 'message-1' });
    expect(policy.assert).toHaveBeenCalledWith(expect.objectContaining({ action: 'email.manual_link', resource: { ownerUserId: 'owner-1', teamId: 'team-1' } }));
    expect(linkConversationCandidateCas).toHaveBeenCalledWith('conversation-1', 'candidate-1', 4, { applicationId: 'application-1', journeyId: undefined });
  });

  it('fails closed when the conversation was already matched or the CAS loses the race', async () => {
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({
        findMessage: vi.fn().mockResolvedValue({ id: 'message-1', direction: 'INBOUND', conversationId: 'conversation-1' }),
        findConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', candidateId: 'existing-candidate', version: 4 }),
      }, {})),
    };
    const inbound = new EmailInboundService(repository as never, new EmailMatcherService('reply-secret'), {} as never, config as never, {} as never, {} as never);
    await expect(inbound.resolveMatch({ messageId: 'message-1', candidateId: 'candidate-1', reason: 'reviewed', actorId: 'actor-1', correlationId: 'corr-1' })).rejects.toThrow('EMAIL_CONVERSATION_ALREADY_MATCHED');

    const losingRepository = {
      withTransaction: vi.fn(async (work: (repo: unknown, transaction: unknown) => Promise<unknown>) => work({
        findMessage: vi.fn().mockResolvedValue({ id: 'message-1', direction: 'INBOUND', conversationId: 'conversation-1' }),
        findConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', candidateId: null, version: 4 }),
        findCandidateForLink: vi.fn().mockResolvedValue({ id: 'candidate-1', ownerId: 'owner-1', teamId: 'team-1', recordStatus: 'ACTIVE' }),
        linkConversationCandidateCas: vi.fn().mockResolvedValue(false),
      }, {})),
    };
    const losingInbound = new EmailInboundService(losingRepository as never, new EmailMatcherService('reply-secret'), {} as never, config as never, {} as never, {} as never);
    await expect(losingInbound.resolveMatch({ messageId: 'message-1', candidateId: 'candidate-1', reason: 'reviewed', actorId: 'actor-1', correlationId: 'corr-1' })).rejects.toThrow('EMAIL_MESSAGE_VERSION_CONFLICT');
  });
});
