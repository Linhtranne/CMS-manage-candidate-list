import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { S3ObjectStorageAdapter, type S3CompatibleClient } from '../../src/platform/storage/s3-object-storage.adapter.js';
import { assertAttachmentSize, assertSafeContentType, detectContentType, sanitizeAttachmentFileName } from '../../src/modules/email-hub/domain/attachment.rules.js';
import { ScanAttachmentProcessor } from '../../src/modules/email-hub/workers/scan-attachment.processor.js';
import { EmailInboundService } from '../../src/modules/email-hub/application/email-inbound.service.js';
import { EmailMatcherService } from '../../src/modules/email-hub/application/email-matcher.service.js';
import { ConversationsController } from '../../src/modules/email-hub/http/conversations.controller.js';

function clientFor(content: Buffer): S3CompatibleClient {
  return {
    putObject: vi.fn(async ({ body }) => { let streamedBytes = 0; for await (const chunk of body) streamedBytes += chunk.length; return { sizeBytes: streamedBytes || content.length }; }),
    headObject: vi.fn(async () => ({ sizeBytes: content.length, checksum: 'checksum' })),
    presignGetObject: vi.fn(async () => ({ url: 'https://storage.test/signed', expiresAt: new Date('2026-08-21T01:00:00.000Z') })),
    deleteObject: vi.fn(async () => undefined),
  };
}

describe('email attachment quarantine and scan', () => {
  it('sanitizes path/control characters and enforces content limits', () => {
    expect(sanitizeAttachmentFileName('../../passport<>.pdf')).toBe('passport__.pdf');
    expect(() => assertAttachmentSize(25 * 1024 * 1024 + 1)).toThrow('ATTACHMENT_SIZE_LIMIT');
    expect(detectContentType(Buffer.from('%PDF-1.7'), 'application/pdf')).toBe('application/pdf');
    expect(() => assertSafeContentType('application/pdf', 'application/octet-stream')).toThrow('ATTACHMENT_MIME_MISMATCH');
  });

  it('streams into quarantine and computes checksum without exposing an object key', async () => {
    const client = clientFor(Buffer.from('safe')); const storage = new S3ObjectStorageAdapter(client);
    const result = await storage.putQuarantine({ objectKey: 'quarantine/email/opaque', source: Readable.from([Buffer.from('safe')]), maxBytes: 10 });
    expect(result).toMatchObject({ objectKey: 'quarantine/email/opaque', sizeBytes: 4 });
    expect(await storage.createSignedDownload(result.objectKey, 60)).toMatchObject({ url: 'https://storage.test/signed' });
    await expect(storage.putQuarantine({ objectKey: 'quarantine/email/too-large', source: Readable.from([Buffer.from('01234567890')]), maxBytes: 10 })).rejects.toThrow('ATTACHMENT_SIZE_LIMIT');
    expect(client.deleteObject).toHaveBeenCalledWith('quarantine/email/too-large');
    const pdfClient = clientFor(Buffer.from('%PDF-1.7'));
    const pdf = await new S3ObjectStorageAdapter(pdfClient).putQuarantine({ objectKey: 'quarantine/email/pdf', source: Readable.from([Buffer.from('%PDF-1.7')]), maxBytes: 20, contentType: 'application/pdf' });
    expect(pdf.contentType).toBe('application/pdf');
  });

  it('marks malicious scanner verdict rejected and scanner outage failed', async () => {
    const repository = {
      findAttachmentForScan: vi.fn().mockResolvedValue({ id: 'attachment-1', status: 'QUARANTINED', fileName: 'x.pdf', contentType: 'application/pdf', sizeBytes: 4, checksum: 'checksum', objectKey: 'quarantine/opaque', providerAttachmentId: 'provider-attachment', message: { providerMessageId: 'provider-message' } }),
      claimAttachmentForScan: vi.fn().mockResolvedValue(true),
      markAttachmentState: vi.fn().mockResolvedValue(true),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work(repository, {})),
    };
    const provider = { fetchAttachment: vi.fn().mockResolvedValue(Readable.from([Buffer.from('safe')])) };
    const storage = { head: vi.fn().mockResolvedValue({ objectKey: 'quarantine/opaque', sizeBytes: 4, checksum: 'checksum', contentType: 'application/pdf' }), putQuarantine: vi.fn(), createSignedDownload: vi.fn(), delete: vi.fn() };
    const scanner = { scan: vi.fn().mockResolvedValue({ verdict: 'REJECTED', reason: 'MALWARE' }) };
    const outbox = { append: vi.fn().mockResolvedValue(undefined) };
    const processor = new ScanAttachmentProcessor(repository as never, provider as never, storage as never, scanner as never, outbox as never);
    await processor.handle({ schemaVersion: 1, eventId: 'scan-1', correlationId: 'corr-1', entityId: 'attachment-1', attachmentId: 'attachment-1' });
    expect(repository.markAttachmentState).toHaveBeenCalledWith('attachment-1', 'REJECTED', expect.objectContaining({ reason: 'MALWARE' }));
    expect(outbox.append).toHaveBeenCalled();
    scanner.scan.mockResolvedValue({ verdict: 'REJECTED', reason: 'ARCHIVE_BOMB' });
    repository.claimAttachmentForScan.mockResolvedValue(true);
    await processor.handle({ schemaVersion: 1, eventId: 'scan-2', correlationId: 'corr-2', entityId: 'attachment-1', attachmentId: 'attachment-1' });
    expect(repository.markAttachmentState).toHaveBeenLastCalledWith('attachment-1', 'REJECTED', expect.objectContaining({ reason: 'ARCHIVE_BOMB' }));
    scanner.scan.mockResolvedValue({ verdict: 'FAILED', reason: 'SCANNER_TIMEOUT' });
    repository.claimAttachmentForScan.mockResolvedValue(true);
    await processor.handle({ schemaVersion: 1, eventId: 'scan-3', correlationId: 'corr-3', entityId: 'attachment-1', attachmentId: 'attachment-1' });
    expect(repository.markAttachmentState).toHaveBeenLastCalledWith('attachment-1', 'FAILED', expect.objectContaining({ reason: 'SCANNER_TIMEOUT' }));
  });

  it('creates quarantine metadata and an ID-only scan handoff in the ingest transaction', async () => {
    const outbox = { append: vi.fn().mockResolvedValue(undefined) };
    const transaction = {};
    const inner = {
      findInboundMessage: vi.fn().mockResolvedValue(null),
      createConversation: vi.fn().mockResolvedValue({ id: 'conversation-1', mailboxId: 'mailbox-1' }),
      createMessage: vi.fn().mockResolvedValue({ id: 'message-1', attachments: [{ id: 'attachment-1' }] }),
      createMatchDecision: vi.fn().mockResolvedValue({}),
      touchConversation: vi.fn().mockResolvedValue({}),
      advanceMailboxCursor: vi.fn(),
    };
    const repository = {
      findActiveMatchCandidates: vi.fn().mockResolvedValue([]),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work(inner, transaction)),
    };
    const provider = { fetchMessage: vi.fn().mockResolvedValue({ providerMessageId: 'provider-1', from: 'candidate@example.test', to: ['ops@example.test'], subject: 'Reply', bodyText: 'Hello', receivedAt: new Date(), attachments: [{ providerAttachmentId: 'provider-attachment-1', fileName: '../../cv.pdf', contentType: 'application/pdf', sizeBytes: 10 }] }) };
    const inbound = new EmailInboundService(repository as never, new EmailMatcherService('reply-secret'), provider as never, { security: { encryptionKey: 'candidate-secret' } } as never, {} as never, outbox as never);
    await inbound.ingest({ mailboxId: 'mailbox-1', providerMessageId: 'provider-1', correlationId: 'corr-1' });
    expect(outbox.append).toHaveBeenCalledWith(transaction, expect.objectContaining({ eventType: 'file.scan.requested', payload: { attachmentId: 'attachment-1', messageId: 'message-1' } }));
    expect(JSON.stringify(outbox.append.mock.calls[0])).not.toContain('objectKey');
  });

  it('rejects content-derived MIME mismatch before invoking the scanner', async () => {
    const repository = {
      findAttachmentForScan: vi.fn().mockResolvedValue({ id: 'attachment-mime', status: 'QUARANTINED', fileName: 'x.pdf', contentType: 'application/pdf', detectedContentType: 'text/plain', sizeBytes: 4, checksum: 'checksum', objectKey: 'quarantine/mime', providerAttachmentId: 'provider-attachment', message: { providerMessageId: 'provider-message' } }),
      claimAttachmentForScan: vi.fn().mockResolvedValue(true),
      markAttachmentState: vi.fn().mockResolvedValue(true),
      withTransaction: vi.fn(async (work: (repo: unknown, tx: unknown) => Promise<unknown>) => work(repository, {})),
    };
    const scanner = { scan: vi.fn() };
    const processor = new ScanAttachmentProcessor(repository as never, {} as never, { head: vi.fn().mockResolvedValue({ objectKey: 'quarantine/mime', sizeBytes: 4, checksum: 'checksum' }) } as never, scanner as never, { append: vi.fn() } as never);
    await processor.handle({ schemaVersion: 1, eventId: 'scan-mime', correlationId: 'corr-mime', entityId: 'attachment-mime', attachmentId: 'attachment-mime' });
    expect(repository.markAttachmentState).toHaveBeenCalledWith('attachment-mime', 'REJECTED', expect.objectContaining({ reason: 'ATTACHMENT_MIME_MISMATCH' }));
    expect(scanner.scan).not.toHaveBeenCalled();
  });

  it('only creates a signed download after SAFE and policy scope checks', async () => {
    const repository = { findAttachmentForDownload: vi.fn().mockResolvedValue({ id: 'attachment-1', status: 'SAFE', objectKey: 'private/opaque', message: { conversation: { candidate: { ownerId: 'user-1', teamId: 'team-1' } } } }) };
    const policy = { assert: vi.fn() };
    const audit = { append: vi.fn().mockResolvedValue(undefined) };
    const prisma = { $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})) };
    const storage = { createSignedDownload: vi.fn().mockResolvedValue({ url: 'https://storage.test/signed', expiresAt: new Date('2026-08-21T01:00:00.000Z') }) };
    const controller = new ConversationsController(repository as never, policy as never, audit as never, prisma as never, {} as never, {} as never, storage as never);
    const response = await controller.createAttachmentDownload('conversation-1', 'attachment-1', { auth: { userId: 'user-1', user: { status: 'ACTIVE' }, teamId: 'team-1', roles: [], sessionId: 'session-1' } } as never);
    expect(response).toEqual({ attachmentId: 'attachment-1', url: 'https://storage.test/signed', expiresAt: expect.any(Date) });
    expect(JSON.stringify(response)).not.toContain('private/opaque');
    expect(policy.assert).toHaveBeenCalled();
    repository.findAttachmentForDownload.mockResolvedValue({ id: 'attachment-1', status: 'SCANNING', objectKey: 'private/opaque', message: { conversation: { candidate: { ownerId: 'user-1', teamId: 'team-1' } } } });
    await expect(controller.createAttachmentDownload('conversation-1', 'attachment-1', { auth: { userId: 'user-1', user: { status: 'ACTIVE' }, teamId: 'team-1', roles: [], sessionId: 'session-1' } } as never)).rejects.toThrow('ATTACHMENT_NOT_SAFE');
  });
});
