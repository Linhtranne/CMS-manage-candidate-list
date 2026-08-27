import { Inject, Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { FILE_SCANNER, type FileScanPort } from '../../../platform/files/file-scan.port.js';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import { assertAttachmentSize, assertSafeContentType } from '../domain/attachment.rules.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';

@Injectable()
export class ScanAttachmentProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(FILE_SCANNER) private readonly scanner: FileScanPort,
    @Inject(OutboxRepository) private readonly outbox: OutboxRepository,
  ) {}

  async handle(payload: QueuePayload): Promise<void> {
    const attachmentId = typeof payload.attachmentId === 'string' ? payload.attachmentId : payload.entityId;
    if (!attachmentId) return;
    let attachment = await this.repository.findAttachmentForScan(attachmentId);
    if (!attachment) return;

    try {
      if (attachment.status === 'DISCOVERED') {
        if (!attachment.message.providerMessageId || !attachment.providerAttachmentId) {
          await this.finish(attachmentId, 'FAILED', 'ATTACHMENT_PROVIDER_REFERENCE_MISSING', payload);
          return;
        }
        if (!await this.repository.markAttachmentDownloading(attachmentId)) return;
        const source = await this.provider.fetchAttachment(attachment.message.providerMessageId, attachment.providerAttachmentId);
        const stored = await this.storage.putQuarantine({ objectKey: attachment.objectKey, source, maxBytes: 25 * 1024 * 1024, contentType: attachment.contentType });
        await this.repository.markAttachmentQuarantined(attachmentId, { checksum: stored.checksum, sizeBytes: stored.sizeBytes, detectedContentType: stored.contentType });
        attachment = await this.repository.findAttachmentForScan(attachmentId);
        if (!attachment) return;
      }
      if (attachment.status !== 'QUARANTINED' || !await this.repository.claimAttachmentForScan(attachmentId)) return;
      const stored = await this.storage.head(attachment.objectKey);
      assertAttachmentSize(stored.sizeBytes);
      if (stored.sizeBytes !== Number(attachment.sizeBytes) || (attachment.checksum && stored.checksum && stored.checksum !== attachment.checksum)) {
        await this.finish(attachmentId, 'REJECTED', 'ATTACHMENT_INTEGRITY_MISMATCH', payload);
        return;
      }
      if (attachment.detectedContentType) assertSafeContentType(attachment.contentType, attachment.detectedContentType);
      const result = await this.scanner.scan({ objectKey: attachment.objectKey, fileName: attachment.fileName, claimedContentType: attachment.contentType, sizeBytes: stored.sizeBytes, checksum: stored.checksum });
      if (result.detectedContentType) assertSafeContentType(attachment.contentType, result.detectedContentType);
      await this.finish(attachmentId, result.verdict, result.reason, payload, result.detectedContentType);
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 240) : 'ATTACHMENT_SCAN_FAILED';
      await this.finish(attachmentId, reason.includes('MIME') || reason.includes('SIZE') || reason.includes('INTEGRITY') ? 'REJECTED' : 'FAILED', reason, payload);
    }
  }

  private async finish(attachmentId: string, status: 'SAFE' | 'REJECTED' | 'FAILED', reason: string | undefined, payload: QueuePayload, detectedContentType?: string): Promise<void> {
    await this.repository.withTransaction(async (repository, transaction) => {
      await repository.markAttachmentState(attachmentId, status, { ...(reason ? { reason } : {}), ...(detectedContentType ? { detectedContentType } : {}) });
      await this.outbox.append(transaction, {
        eventType: status === 'SAFE' ? 'document.candidate.created' : 'attachment.scan.failed',
        aggregateType: 'EMAIL_ATTACHMENT',
        aggregateId: attachmentId,
        idempotencyKey: `email-attachment:${attachmentId}:${status}`,
        correlationId: payload.correlationId,
        payload: { attachmentId, status, ...(reason ? { reason } : {}) },
      });
    });
  }
}
