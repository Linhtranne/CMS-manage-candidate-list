import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { EmailMessageDirection, EmailMessageStatus, MailboxHealthStatus, MailboxProvider } from '../domain/email.types.js';
import type { ProviderSendResult } from '../domain/email.types.js';

export const EMAIL_CONVERSATION_VIEWS = ['all', 'needs-action', 'unmatched', 'sent', 'received', 'waiting-candidate', 'waiting-internal', 'completed', 'failed'] as const;
export type EmailConversationView = (typeof EMAIL_CONVERSATION_VIEWS)[number];

export interface ConversationReadScope {
  denied: boolean;
  includeUnmatched: boolean;
  candidateClauses: readonly { ownerId?: string; teamId?: string }[];
}

export interface ConversationQueryInput {
  query?: string;
  view?: EmailConversationView;
  journeyId?: string;
  cursor?: string;
  limit?: number;
  scope: ConversationReadScope;
}

interface ConversationCursor {
  lastActivityAt: string;
  id: string;
}

function conversationLimit(value?: number): number {
  if (value === undefined) return 25;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    const error = new Error('INVALID_LIMIT');
    Object.assign(error, { code: 'INVALID_LIMIT', statusCode: 422 });
    throw error;
  }
  return value;
}

function decodeConversationCursor(value?: string): ConversationCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<ConversationCursor>;
    if (typeof parsed.lastActivityAt !== 'string' || typeof parsed.id !== 'string' || Number.isNaN(new Date(parsed.lastActivityAt).getTime())) throw new Error('invalid cursor');
    return { lastActivityAt: parsed.lastActivityAt, id: parsed.id };
  } catch {
    const error = new Error('INVALID_CURSOR');
    Object.assign(error, { code: 'INVALID_CURSOR', statusCode: 422 });
    throw error;
  }
}

function encodeConversationCursor(lastActivityAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ lastActivityAt: lastActivityAt.toISOString(), id }), 'utf8').toString('base64url');
}

function conversationViewWhere(view: EmailConversationView | undefined): Prisma.EmailConversationWhereInput | undefined {
  switch (view) {
    case undefined:
    case 'all': return undefined;
    case 'needs-action': return { status: 'NEEDS_ACTION' };
    case 'unmatched': return { status: 'UNMATCHED', candidateId: null };
    case 'sent': return { status: 'SENT' };
    case 'received': return { status: 'RECEIVED' };
    case 'waiting-candidate': return { status: 'NEEDS_ACTION', candidateId: null };
    case 'waiting-internal': return { status: 'NEEDS_ACTION', candidateId: { not: null } };
    case 'completed': return { status: 'CLOSED' };
    case 'failed': return { messages: { some: { status: 'FAILED' } } };
  }
}

export interface CreateMailboxInput {
  address: string;
  displayName: string;
  provider?: MailboxProvider;
  status?: MailboxHealthStatus;
  providerAccountRef?: string;
}

export interface CreateConversationInput {
  mailboxId: string;
  candidateId?: string;
  applicationId?: string;
  journeyId?: string;
  subject: string;
  snippet: string;
  lastActivityAt: Date;
  status?: string;
}

export interface CreateMessageInput {
  mailboxId: string;
  conversationId: string;
  direction: EmailMessageDirection;
  status: EmailMessageStatus;
  providerMessageId?: string;
  providerThreadId?: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: readonly string[];
  idempotencyKey?: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  sanitizedHtml?: string;
  sentOrReceivedAt: Date;
  recipients: readonly { kind: 'TO' | 'CC' | 'BCC'; address: string }[];
  attachments?: readonly {
    id: string;
    providerAttachmentId?: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    objectKey: string;
    status?: string;
  }[];
}

@Injectable()
export class EmailPrismaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: EmailPrismaRepository, transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      return this.prisma.$transaction(async (transaction) => work(new EmailPrismaRepository(transaction), transaction));
    }
    return work(this, this.prisma);
  }

  createMailbox(input: CreateMailboxInput) {
    return this.prisma.mailbox.create({
      data: {
        address: input.address,
        displayName: input.displayName,
        provider: input.provider ?? 'DISABLED',
        status: input.status ?? 'NOT_CONFIGURED',
        ...(input.providerAccountRef ? { providerAccountRef: input.providerAccountRef } : {}),
      },
    });
  }

  findMailboxesDueForSubscriptionRenewal(now: Date, leadMs: number, limit = 100) {
    const boundedLeadMs = Math.max(0, Math.min(leadMs, 7 * 24 * 60 * 60 * 1000));
    const dueBefore = new Date(now.getTime() + boundedLeadMs);
    return this.prisma.mailbox.findMany({
      where: {
        providerSubscriptionId: { not: null },
        status: { in: ['HEALTHY', 'DEGRADED'] },
        OR: [
          { providerSubscriptionExpiresAt: null },
          { providerSubscriptionExpiresAt: { lte: dueBefore } },
        ],
      },
      select: { id: true, providerSubscriptionExpiresAt: true },
      orderBy: [{ providerSubscriptionExpiresAt: 'asc' }, { id: 'asc' }],
      take: Math.max(1, Math.min(limit, 500)),
    });
  }

  markSubscriptionRenewed(mailboxId: string, input: { subscriptionId: string; expiresAt: Date; renewedAt?: Date }) {
    return this.prisma.mailbox.updateMany({
      where: { id: mailboxId, status: { in: ['HEALTHY', 'DEGRADED'] } },
      data: {
        providerSubscriptionId: input.subscriptionId,
        providerSubscriptionExpiresAt: input.expiresAt,
        lastSubscriptionRenewedAt: input.renewedAt ?? new Date(),
        version: { increment: 1 },
      },
    });
  }

  markSubscriptionRenewalFailure(mailboxId: string, status: 'DEGRADED' | 'PAUSED_AUTH') {
    return this.prisma.mailbox.updateMany({
      where: { id: mailboxId, status: { not: 'PAUSED_OPERATOR' } },
      data: { status, version: { increment: 1 } },
    });
  }

  createConversation(input: CreateConversationInput) {
    return this.prisma.emailConversation.create({
      data: {
        mailboxId: input.mailboxId,
        ...(input.candidateId ? { candidateId: input.candidateId } : {}),
        ...(input.applicationId ? { applicationId: input.applicationId } : {}),
        ...(input.journeyId ? { journeyId: input.journeyId } : {}),
        subject: input.subject,
        snippet: input.snippet,
        ...(input.status ? { status: input.status } : {}),
        lastActivityAt: input.lastActivityAt,
      },
    });
  }

  createMessage(input: CreateMessageInput) {
    return this.prisma.emailMessage.create({
      data: {
        mailboxId: input.mailboxId,
        conversationId: input.conversationId,
        direction: input.direction,
        status: input.status,
        ...(input.providerMessageId ? { providerMessageId: input.providerMessageId } : {}),
        ...(input.providerThreadId ? { providerThreadId: input.providerThreadId } : {}),
        ...(input.internetMessageId ? { internetMessageId: input.internetMessageId } : {}),
        ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
        ...(input.references ? { referencesJson: input.references as Prisma.InputJsonValue } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        fromAddress: input.fromAddress,
        subject: input.subject,
        bodyText: input.bodyText,
        ...(input.sanitizedHtml ? { sanitizedHtml: input.sanitizedHtml } : {}),
        sentOrReceivedAt: input.sentOrReceivedAt,
        recipients: { create: input.recipients.map((recipient, position) => ({ ...recipient, position })) },
        ...(input.attachments?.length ? { attachments: { create: input.attachments.map((attachment) => ({ id: attachment.id, ...(attachment.providerAttachmentId ? { providerAttachmentId: attachment.providerAttachmentId } : {}), fileName: attachment.fileName, contentType: attachment.contentType, sizeBytes: attachment.sizeBytes, objectKey: attachment.objectKey, ...(attachment.status ? { status: attachment.status } : {}) })) } } : {}),
      },
      include: { recipients: true, attachments: true },
    });
  }

  findMessage(id: string) {
    return this.prisma.emailMessage.findUnique({ where: { id }, include: { recipients: true, attachments: true } });
  }

  findMailbox(id: string) {
    return this.prisma.mailbox.findUnique({ where: { id } });
  }

  findConversation(id: string) {
    return this.prisma.emailConversation.findUnique({ where: { id } });
  }

  findConversationForSend(id: string) {
    return this.prisma.emailConversation.findUnique({
      where: { id },
      include: {
        mailbox: { select: { id: true, address: true, provider: true, status: true } },
        candidate: { select: { id: true, ownerId: true, teamId: true, contactabilityStatus: true, emailBlindIndex: true } },
      },
    });
  }

  findConversationForLink(id: string) {
    return this.prisma.emailConversation.findUnique({ where: { id }, select: { id: true, mailboxId: true, candidateId: true, applicationId: true, journeyId: true, version: true } });
  }

  findConversationSummary(id: string) {
    return this.prisma.emailConversation.findUnique({ where: { id }, include: { candidate: { select: { id: true, code: true, name: true } } } });
  }

  findCandidateForLink(id: string) {
    return this.prisma.candidate.findUnique({ where: { id }, select: { id: true, ownerId: true, teamId: true, recordStatus: true } });
  }

  findAttachmentsForPreview(ids: readonly string[], conversationId: string) {
    if (!ids.length) return Promise.resolve([]);
    return this.prisma.emailAttachment.findMany({ where: { id: { in: [...ids] }, message: { conversationId } }, select: { id: true, status: true } });
  }

  async linkConversationCandidateCas(id: string, candidateId: string, expectedVersion: number, context: { applicationId?: string | null; journeyId?: string | null } = {}): Promise<boolean> {
    const updated = await this.prisma.emailConversation.updateMany({
      where: { id, version: expectedVersion, candidateId: null },
      data: {
        candidateId,
        status: 'MATCHED',
        version: { increment: 1 },
        ...(context.applicationId !== undefined ? { applicationId: context.applicationId } : {}),
        ...(context.journeyId !== undefined ? { journeyId: context.journeyId } : {}),
      },
    });
    return updated.count === 1;
  }

  async listConversations(input: ConversationQueryInput) {
    const limit = conversationLimit(input.limit);
    const where = this.conversationWhere(input);
    const rows = await this.prisma.emailConversation.findMany({
      where,
      orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { candidate: { select: { id: true, code: true, name: true } } },
    });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeConversationCursor(last.lastActivityAt, last.id) : null,
    };
  }

  findConversationForRead(id: string, scope: ConversationReadScope) {
    return this.prisma.emailConversation.findFirst({
      where: this.conversationWhere({ scope, id }),
      include: {
        candidate: { select: { id: true, code: true, name: true } },
        messages: {
          orderBy: [{ sentOrReceivedAt: 'asc' }, { id: 'asc' }],
          include: { recipients: { orderBy: [{ position: 'asc' }, { id: 'asc' }] }, attachments: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
        },
      },
    });
  }

  private conversationWhere(input: ConversationQueryInput & { id?: string }): Prisma.EmailConversationWhereInput {
    if (input.scope.denied) return { id: '__DENY_ALL__' };
    const and: Prisma.EmailConversationWhereInput[] = [];
    if (input.id) and.push({ id: input.id });
    if (input.journeyId) and.push({ journeyId: input.journeyId });

    const viewWhere = conversationViewWhere(input.view);
    if (viewWhere) and.push(viewWhere);

    const candidateClauses = input.scope.candidateClauses.flatMap((clause): Array<{ ownerId?: string; teamId?: string }> => {
      if (clause.ownerId) return [{ ownerId: clause.ownerId }];
      if (clause.teamId) return [{ teamId: clause.teamId }];
      return [];
    });
    if (candidateClauses.length) {
      const scopedCandidate = { candidate: { OR: candidateClauses } } as Prisma.EmailConversationWhereInput;
      and.push(input.scope.includeUnmatched ? { OR: [scopedCandidate, { candidateId: null }] } : scopedCandidate);
    } else if (input.scope.includeUnmatched && input.view === 'unmatched') {
      and.push({ candidateId: null });
    }

    const term = input.query?.trim();
    if (term) {
      and.push({ OR: [
        { subject: { contains: term, mode: 'insensitive' } },
        { snippet: { contains: term, mode: 'insensitive' } },
        { candidate: { name: { contains: term, mode: 'insensitive' } } },
        { candidate: { code: { contains: term, mode: 'insensitive' } } },
      ] });
    }

    const cursor = decodeConversationCursor(input.cursor);
    if (cursor) {
      const lastActivityAt = new Date(cursor.lastActivityAt);
      and.push({ OR: [{ lastActivityAt: { lt: lastActivityAt } }, { lastActivityAt, id: { lt: cursor.id } }] });
    }
    return and.length ? { AND: and } : {};
  }

  findCandidateContactability(id: string) {
    return this.prisma.candidate.findUnique({ where: { id }, select: { contactabilityStatus: true, emailBlindIndex: true, ownerId: true, teamId: true } });
  }

  findMessageForSend(id: string) {
    return this.prisma.emailMessage.findUnique({ where: { id }, include: { recipients: true, attachments: true, mailbox: true, conversation: { include: { candidate: true } } } });
  }

  async claimForSend(id: string): Promise<boolean> {
    const result = await this.prisma.emailMessage.updateMany({
      where: { id, status: { in: ['QUEUED', 'RETRY_WAIT'] } },
      data: { status: 'SENDING', version: { increment: 1 } },
    });
    return result.count === 1;
  }

  async markSent(id: string, result: ProviderSendResult): Promise<boolean> {
    const message = await this.prisma.emailMessage.findUnique({ where: { id }, select: { mailboxId: true } });
    if (!message) return false;
    const updated = await this.prisma.emailMessage.updateMany({
      where: { id, status: 'SENDING' },
      data: {
        status: 'SENT',
        providerMessageId: result.providerMessageId,
        ...(result.internetMessageId ? { internetMessageId: result.internetMessageId } : {}),
        sentOrReceivedAt: result.acceptedAt,
        version: { increment: 1 },
      },
    });
    if (updated.count === 1) {
      await this.prisma.mailbox.update({ where: { id: message.mailboxId }, data: { lastSendAt: result.acceptedAt, version: { increment: 1 } } });
    }
    return updated.count === 1;
  }

  async markSendState(id: string, from: 'SENDING' | 'RECONCILING', to: Extract<EmailMessageStatus, 'RETRY_WAIT' | 'RECONCILING' | 'FAILED'>): Promise<boolean> {
    const updated = await this.prisma.emailMessage.updateMany({ where: { id, status: from }, data: { status: to, version: { increment: 1 } } });
    return updated.count === 1;
  }

  async markReconciledSent(id: string, result: ProviderSendResult): Promise<boolean> {
    const message = await this.prisma.emailMessage.findUnique({ where: { id }, select: { mailboxId: true } });
    if (!message) return false;
    const updated = await this.prisma.emailMessage.updateMany({
      where: { id, status: 'RECONCILING' },
      data: {
        status: 'SENT',
        providerMessageId: result.providerMessageId,
        ...(result.internetMessageId ? { internetMessageId: result.internetMessageId } : {}),
        sentOrReceivedAt: result.acceptedAt,
        version: { increment: 1 },
      },
    });
    if (updated.count === 1) {
      await this.prisma.mailbox.update({ where: { id: message.mailboxId }, data: { lastSendAt: result.acceptedAt, version: { increment: 1 } } });
    }
    return updated.count === 1;
  }

  async cancelBeforeSend(id: string): Promise<boolean> {
    const updated = await this.prisma.emailMessage.updateMany({ where: { id, status: { in: ['QUEUED', 'RETRY_WAIT'] } }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    return updated.count === 1;
  }

  async retryFailed(id: string): Promise<boolean> {
    const updated = await this.prisma.emailMessage.updateMany({ where: { id, status: 'FAILED' }, data: { status: 'QUEUED', version: { increment: 1 } } });
    return updated.count === 1;
  }

  async pauseMailboxAuth(id: string): Promise<boolean> {
    const updated = await this.prisma.mailbox.updateMany({ where: { id, status: { not: 'PAUSED_OPERATOR' } }, data: { status: 'PAUSED_AUTH', version: { increment: 1 } } });
    return updated.count === 1;
  }

  async pauseMailboxOperator(id: string): Promise<boolean> {
    const updated = await this.prisma.mailbox.updateMany({ where: { id, status: { not: 'PAUSED_OPERATOR' } }, data: { status: 'PAUSED_OPERATOR', version: { increment: 1 } } });
    return updated.count === 1;
  }

  async resumeMailbox(id: string): Promise<boolean> {
    const updated = await this.prisma.mailbox.updateMany({ where: { id, status: { in: ['PAUSED_OPERATOR', 'PAUSED_AUTH', 'DEGRADED'] }, provider: { not: 'DISABLED' } }, data: { status: 'HEALTHY', version: { increment: 1 } } });
    return updated.count === 1;
  }

  async claimWebhookNotification(input: { provider: MailboxProvider; mailboxId: string; notificationId: string; providerMessageId?: string; expiresAt: Date }): Promise<boolean> {
    const inserted = await this.prisma.$executeRaw`
      INSERT INTO email_webhook_notifications (provider, mailbox_id, notification_id, provider_message_id, expires_at)
      VALUES (${input.provider}, ${input.mailboxId}::uuid, ${input.notificationId}, ${input.providerMessageId ?? ''}, ${input.expiresAt})
      ON CONFLICT (provider, mailbox_id, notification_id) DO NOTHING
    `;
    return inserted === 1;
  }

  async findInboundMessage(mailboxId: string, providerMessageId: string) {
    return this.prisma.emailMessage.findFirst({ where: { mailboxId, providerMessageId }, include: { recipients: true, attachments: true } });
  }

  findAttachmentForScan(id: string) {
    return this.prisma.emailAttachment.findUnique({ where: { id }, include: { message: { select: { id: true, mailboxId: true, providerMessageId: true } } } });
  }

  findAttachmentForDownload(id: string, conversationId: string) {
    return this.prisma.emailAttachment.findFirst({
      where: { id, message: { conversationId } },
      include: { message: { select: { id: true, conversationId: true, status: true, conversation: { select: { candidate: { select: { ownerId: true, teamId: true } } } } } } },
    });
  }

  async claimAttachmentForScan(id: string): Promise<boolean> {
    const result = await this.prisma.emailAttachment.updateMany({ where: { id, status: 'QUARANTINED' }, data: { status: 'SCANNING' } });
    return result.count === 1;
  }

  async markAttachmentDownloading(id: string): Promise<boolean> {
    const result = await this.prisma.emailAttachment.updateMany({ where: { id, status: 'DISCOVERED' }, data: { status: 'DOWNLOADING' } });
    return result.count === 1;
  }

  async markAttachmentQuarantined(id: string, input: { checksum: string; sizeBytes: number; detectedContentType?: string }): Promise<boolean> {
    const result = await this.prisma.emailAttachment.updateMany({ where: { id, status: 'DOWNLOADING' }, data: { status: 'QUARANTINED', checksum: input.checksum, sizeBytes: input.sizeBytes, ...(input.detectedContentType ? { detectedContentType: input.detectedContentType } : {}), quarantinedAt: new Date() } });
    return result.count === 1;
  }

  async markAttachmentState(id: string, status: string, input: { reason?: string; detectedContentType?: string } = {}): Promise<boolean> {
    const result = await this.prisma.emailAttachment.updateMany({ where: { id, status: { in: ['QUARANTINED', 'SCANNING', 'DOWNLOADING', 'DISCOVERED'] } }, data: { status, ...(input.reason ? { scanReason: input.reason } : {}), ...(input.detectedContentType ? { detectedContentType: input.detectedContentType } : {}), ...(status === 'SAFE' || status === 'REJECTED' || status === 'FAILED' ? { scannedAt: new Date() } : {}) } });
    return result.count === 1;
  }

  async findActiveMatchCandidates(mailboxId: string, sender: string, providerThreadId?: string | null) {
    const conversations = await this.prisma.emailConversation.findMany({
      where: { mailboxId, status: { not: 'CLOSED' }, ...(providerThreadId ? { messages: { some: { providerThreadId } } } : {}) },
      include: { messages: { select: { internetMessageId: true, providerThreadId: true }, orderBy: { sentOrReceivedAt: 'desc' }, take: 20 }, candidate: { select: { id: true, emailBlindIndex: true } } },
      orderBy: { lastActivityAt: 'desc' },
      take: 50,
    });
    return conversations.map((conversation) => ({
      conversationId: conversation.id,
      candidateId: conversation.candidateId,
      candidateEmailBlindIndex: conversation.candidate?.emailBlindIndex ?? null,
      providerThreadId: conversation.messages.find((message) => message.providerThreadId)?.providerThreadId ?? null,
      internetMessageIds: conversation.messages.map((message) => message.internetMessageId).filter((value): value is string => Boolean(value)),
      sender,
    }));
  }

  async advanceMailboxCursor(mailboxId: string, cursor: { value: string; issuedAt: Date }) {
    return this.prisma.mailbox.update({ where: { id: mailboxId }, data: { syncCursor: cursor.value, syncCursorIssuedAt: cursor.issuedAt, lastSyncAt: new Date(), version: { increment: 1 } } });
  }

  createMatchDecision(input: { messageId: string; state: string; candidateId?: string | null; reason?: string; resolvedById?: string | null }) {
    return this.prisma.emailMatchDecision.create({
      data: {
        messageId: input.messageId,
        state: input.state,
        ...(input.candidateId ? { candidateId: input.candidateId } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.resolvedById ? { resolvedById: input.resolvedById } : {}),
      },
    });
  }

  linkConversationCandidate(id: string, candidateId: string) {
    return this.prisma.emailConversation.update({ where: { id }, data: { candidateId, status: 'MATCHED', version: { increment: 1 } } });
  }

  touchConversation(id: string, input: { candidateId?: string | null; status: string; snippet: string; lastActivityAt: Date }) {
    return this.prisma.emailConversation.update({
      where: { id },
      data: {
        status: input.status,
        snippet: input.snippet,
        lastActivityAt: input.lastActivityAt,
        messageCount: { increment: 1 },
        hasUnreadInbound: true,
        version: { increment: 1 },
        ...(input.candidateId ? { candidateId: input.candidateId } : {}),
      },
    });
  }

  touchConversationOutbound(id: string, input: { snippet: string; lastActivityAt: Date }) {
    return this.prisma.emailConversation.update({
      where: { id },
      data: {
        snippet: input.snippet,
        lastActivityAt: input.lastActivityAt,
        messageCount: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  async transitionMessage(id: string, expectedStatus: EmailMessageStatus, targetStatus: EmailMessageStatus) {
    const result = await this.prisma.emailMessage.updateMany({ where: { id, status: expectedStatus }, data: { status: targetStatus, version: { increment: 1 } } });
    if (result.count !== 1) throw new Error('EMAIL_MESSAGE_VERSION_CONFLICT');
    return this.findMessage(id);
  }
}
