import { describe, expect, it, vi } from 'vitest';
import { EmailQueryService, serializeConversationDetail } from '../../src/modules/email-hub/application/email-query.service.js';
import { EmailPrismaRepository } from '../../src/modules/email-hub/infrastructure/email.prisma-repository.js';

const actor = {
  userId: 'user-1',
  status: 'ACTIVE' as const,
  teamId: 'team-1',
  roles: [{ code: 'RECRUITER', scope: 'TEAM' as const }],
};

describe('email conversation queries', () => {
  it('translates the policy scope into a bounded candidate filter and keeps unmatched mail privileged', async () => {
    const repository = { listConversations: vi.fn().mockResolvedValue({ items: [], hasMore: false }) };
    const policy = {
      scopeFilter: vi.fn()
        .mockReturnValueOnce({ OR: [{ ownerUserId: 'user-1' }, { teamId: 'team-1' }] })
        .mockReturnValueOnce({ OR: [{ teamId: 'team-1' }] }),
      assert: vi.fn(),
    };
    const service = new EmailQueryService(repository as never, policy as never);

    await service.list({ view: 'unmatched', limit: 10 }, actor);

    expect(policy.assert).toHaveBeenCalledWith(expect.objectContaining({ action: 'email.manual_link' }));
    expect(repository.listConversations).toHaveBeenCalledWith(expect.objectContaining({
      view: 'unmatched',
      scope: {
        denied: false,
        includeUnmatched: true,
        candidateClauses: [{ ownerId: 'user-1' }, { teamId: 'team-1' }],
      },
    }));
  });

  it('fails closed when the email read scope has no usable role', async () => {
    const repository = { listConversations: vi.fn() };
    const policy = {
      scopeFilter: vi.fn().mockReturnValue({ id: '__DENY_ALL__' }),
      assert: vi.fn(() => { throw new Error('FORBIDDEN'); }),
    };
    const service = new EmailQueryService(repository as never, policy as never);

    await service.list({}, actor);

    expect(repository.listConversations).not.toHaveBeenCalled();
  });

  it('fails closed for an unexpected non-empty policy filter', async () => {
    const repository = { listConversations: vi.fn() };
    const policy = { scopeFilter: vi.fn().mockReturnValue({ unexpected: 'value' }), assert: vi.fn() };
    const service = new EmailQueryService(repository as never, policy as never);

    await expect(service.list({}, actor)).resolves.toMatchObject({ items: [], page: { hasMore: false, nextCursor: null } });
    expect(repository.listConversations).not.toHaveBeenCalled();
  });

  it('serializes messages and attachments without exposing provider IDs or object keys', () => {
    const row = {
      id: 'conversation-1', subject: 'Subject', snippet: 'Snippet', status: 'MATCHED',
      lastActivityAt: new Date('2026-08-21T00:00:00.000Z'), messageCount: 1, hasUnreadInbound: true, version: 2,
      candidate: { id: 'candidate-1', code: 'CA-1', name: 'Candidate' }, applicationId: 'application-1', journeyId: null,
      messages: [{
        id: 'message-1', direction: 'INBOUND', status: 'RECEIVED', fromAddress: 'candidate@example.test', subject: 'Subject',
        bodyText: 'Body', sanitizedHtml: '<p>Body</p>', sentOrReceivedAt: new Date('2026-08-21T00:00:00.000Z'), immutable: true,
        providerMessageId: 'provider-secret', recipients: [
          { kind: 'TO', address: 'ops@example.test', position: 0 },
          { kind: 'CC', address: 'cc@example.test', position: 1 },
          { kind: 'BCC', address: 'hidden@example.test', position: 2 },
        ], attachments: [{ id: 'attachment-1', fileName: 'cv.pdf', sizeBytes: BigInt(42), status: 'SAFE', objectKey: 'private/raw-key' }],
      }],
    };

    const serialized = serializeConversationDetail(row as never);
    expect(serialized).toMatchObject({
      id: 'conversation-1',
      candidate: { id: 'candidate-1', code: 'CA-1', name: 'Candidate' },
      messages: [{ from: 'candidate@example.test', to: ['ops@example.test'], cc: ['cc@example.test'], attachmentIds: ['attachment-1'], immutable: true }],
      attachments: [{ id: 'attachment-1', fileName: 'cv.pdf', sizeBytes: 42, scanStatus: 'SAFE', downloadUrl: null }],
      internalNotes: [],
    });
    expect(JSON.stringify(serialized)).not.toContain('provider-secret');
    expect(JSON.stringify(serialized)).not.toContain('private/raw-key');
    expect(JSON.stringify(serialized)).not.toContain('hidden@example.test');
  });

  it('builds a stable, filtered and bounded Prisma conversation query', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new EmailPrismaRepository({ emailConversation: { findMany } } as never);

    await repository.listConversations({
      query: 'candidate', view: 'failed', journeyId: 'journey-1', cursor: Buffer.from(JSON.stringify({ lastActivityAt: '2026-08-20T00:00:00.000Z', id: 'conversation-9' })).toString('base64url'), limit: 25,
      scope: { denied: false, includeUnmatched: false, candidateClauses: [{ teamId: 'team-1' }] },
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 26,
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { journeyId: 'journey-1' },
          { candidate: { OR: [{ teamId: 'team-1' }] } },
          { messages: { some: { status: 'FAILED' } } },
        ]),
      }),
    }));
  });
});
