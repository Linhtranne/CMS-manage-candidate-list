import { Inject, Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import { EmailInboundService } from '../application/email-inbound.service.js';
import type { MailCursor } from '../domain/email.types.js';

@Injectable()
export class MailSyncProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    private readonly inbound: EmailInboundService,
  ) {}

  async handle(payload: QueuePayload): Promise<void> {
    const mailboxId = typeof payload.entityId === 'string' ? payload.entityId : typeof payload.mailboxId === 'string' ? payload.mailboxId : undefined;
    if (!mailboxId) return;
    const mailbox = await this.repository.findMailbox(mailboxId);
    if (!mailbox || !['HEALTHY', 'DEGRADED'].includes(mailbox.status)) return;
    const cursor: MailCursor | null = mailbox.syncCursor && mailbox.syncCursorIssuedAt ? { value: mailbox.syncCursor, issuedAt: mailbox.syncCursorIssuedAt } : null;
    const page = await this.provider.fetchChanges(cursor, 100);
    for (const change of page.changes) {
      await this.inbound.ingest({ mailboxId, providerMessageId: change.providerMessageId, correlationId: payload.correlationId });
    }
    if (page.nextCursor) await this.repository.advanceMailboxCursor(mailboxId, page.nextCursor);
  }
}
