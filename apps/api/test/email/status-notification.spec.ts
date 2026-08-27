import { describe, expect, it, vi } from 'vitest';
import { encryptCandidateValue } from '../../src/modules/candidates/infrastructure/candidate.crypto.js';
import { StatusNotificationProcessor } from '../../src/modules/email-hub/workers/status-notification.processor.js';

const encryptionKey = 'local-status-notification-secret';

function runtime(overrides: Record<string, unknown> = {}) {
  return {
    security: { encryptionKey },
    mail: {
      mode: 'NOTIFICATION_ONLY',
      enabled: true,
      senderAddress: 'noreply@company.vn',
      ...(overrides.mail as Record<string, unknown> | undefined),
    },
  } as never;
}

function payload(eventType = 'application.status_changed') {
  return {
    schemaVersion: 1,
    eventId: 'event-status-1',
    correlationId: 'corr-status-1',
    entityId: 'application-1',
    eventType,
    toStatus: 'PASSED',
  };
}

describe('status notification worker', () => {
  it('creates one immutable outbound message with sender and idempotency key', async () => {
    const createMessage = vi.fn().mockResolvedValue({ id: 'message-1', sentOrReceivedAt: new Date('2026-08-26T00:00:00.000Z') });
    const repository = {
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => {
        const txRepo = {
          createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1' }),
          createMessage,
          touchConversationOutbound: vi.fn().mockResolvedValue({}),
        };
        const tx = {
          emailMessage: { findFirst: vi.fn().mockResolvedValue(null) },
          emailConversation: { findFirst: vi.fn().mockResolvedValue(null) },
        };
        return work(txRepo, tx);
      }),
    };
    const prisma = {
      application: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'application-1',
          status: 'PASSED',
          candidate: {
            id: 'candidate-1',
            name: 'Nguyễn Minh An',
            emailCiphertext: encryptCandidateValue('candidate@example.test', encryptionKey),
            contactabilityStatus: 'CONTACTABLE',
          },
          jobOrder: { position: 'Backend Engineer' },
        }),
      },
      mailbox: { findFirst: vi.fn().mockResolvedValue({ id: 'mailbox-1', address: 'noreply@company.vn' }) },
    };
    const outbox = { append: vi.fn().mockResolvedValue({}) };
    const audit = { append: vi.fn().mockResolvedValue({}) };
    const processor = new StatusNotificationProcessor(prisma as never, repository as never, outbox as never, audit as never, runtime());

    await processor.handle(payload());

    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
      mailboxId: 'mailbox-1',
      direction: 'OUTBOUND',
      status: 'QUEUED',
      idempotencyKey: 'status-notification:event-status-1',
      fromAddress: 'noreply@company.vn',
      recipients: [{ kind: 'TO', address: 'candidate@example.test' }],
    }));
    expect(outbox.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventType: 'email.send.requested' }));
    expect(audit.append).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'EMAIL_STATUS_NOTIFICATION_ENQUEUED' }));
  });

  it('does not process when notifications are disabled or the candidate cannot be contacted', async () => {
    const repository = { withTransaction: vi.fn() };
    const prisma = {
      application: { findUnique: vi.fn() },
      mailbox: { findFirst: vi.fn() },
    };
    const processor = new StatusNotificationProcessor(prisma as never, repository as never, {} as never, {} as never, runtime({ mail: { enabled: false } }));

    await processor.handle(payload());

    expect(prisma.application.findUnique).not.toHaveBeenCalled();
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });
});
