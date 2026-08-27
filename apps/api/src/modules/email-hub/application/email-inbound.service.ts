import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { EmailMatcherService, type EmailMatchResult } from './email-matcher.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import { candidateBlindIndex } from '../../candidates/infrastructure/candidate.crypto.js';
import { normalizeEmailAddress, sanitizeEmailHtml } from '../domain/email.rules.js';
import { EmailDomainError } from '../domain/email.types.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { assertAttachmentSize, MAX_EMAIL_ATTACHMENT_COUNT, sanitizeAttachmentFileName } from '../domain/attachment.rules.js';
import { PolicyService } from '../../identity-access/application/policy.service.js';
import type { ActorRole } from '../../identity-access/domain/permission.registry.js';

export interface IngestEmailInput {
  mailboxId: string;
  providerMessageId: string;
  correlationId: string;
  cursor?: { value: string; issuedAt: Date };
}

@Injectable()
export class EmailInboundService {
  constructor(
    private readonly repository: EmailPrismaRepository,
    private readonly matcher: EmailMatcherService,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig | undefined,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxRepository,
    @Optional() private readonly policy?: PolicyService,
  ) {}

  async ingest(input: IngestEmailInput): Promise<{ duplicate: boolean; messageId?: string; match: EmailMatchResult }> {
    if (this.config?.mail?.mode === 'NOTIFICATION_ONLY') {
      throw new EmailDomainError('EMAIL_INBOUND_DISABLED', 'errors.emailInboundDisabled', 409);
    }
    const providerMessage = await this.provider.fetchMessage(input.providerMessageId);
    const candidates = await this.repository.findActiveMatchCandidates(input.mailboxId, providerMessage.from, providerMessage.providerThreadId);
    const senderBlindIndex = candidateBlindIndex(providerMessage.from.trim().toLowerCase(), this.config?.security.encryptionKey ?? '');
    const matchCandidates = candidates.map((candidate) => ({
      conversationId: candidate.conversationId,
      candidateId: candidate.candidateId,
      providerThreadId: candidate.providerThreadId,
      internetMessageIds: candidate.internetMessageIds,
      sender: candidate.candidateEmailBlindIndex && candidate.candidateEmailBlindIndex === senderBlindIndex ? providerMessage.from : undefined,
    }));
    const headers = providerMessage.headers ?? {};
    const match = this.matcher.match({
      replyToken: headers['X-CMS-Reply-Token'] ?? headers['x-cms-reply-token'],
      inReplyTo: providerMessage.inReplyTo,
      references: providerMessage.references,
      providerThreadId: providerMessage.providerThreadId,
      sender: providerMessage.from,
      candidates: matchCandidates,
    });
    const normalizedFrom = normalizeEmailAddress(providerMessage.from);
    const attachmentInputs = (providerMessage.attachments ?? []).map((attachment) => {
      assertAttachmentSize(attachment.sizeBytes);
      const id = randomUUID();
      const opaque = createHash('sha256').update(`${input.mailboxId}:${input.providerMessageId}:${attachment.providerAttachmentId}`).digest('hex');
      return {
        id,
        providerAttachmentId: attachment.providerAttachmentId,
        fileName: sanitizeAttachmentFileName(attachment.fileName),
        contentType: attachment.contentType.trim().toLowerCase() || 'application/octet-stream',
        sizeBytes: attachment.sizeBytes,
        objectKey: `quarantine/email/${opaque}/${id}`,
        status: 'DISCOVERED',
      };
    });
    if (attachmentInputs.length > MAX_EMAIL_ATTACHMENT_COUNT) throw new Error('ATTACHMENT_COUNT_LIMIT');
    return this.repository.withTransaction(async (repository, transaction) => {
      if (await repository.findInboundMessage(input.mailboxId, input.providerMessageId)) return { duplicate: true, match };
      const matched = match.state === 'MATCHED' ? match : undefined;
      const matchedCandidateId = match.state === 'MATCHED' ? match.candidateId : undefined;
      const conversation = matched
        ? await repository.findConversation(matched.conversationId)
        : await repository.createConversation({
          mailboxId: input.mailboxId,
          ...(matchedCandidateId ? { candidateId: matchedCandidateId } : {}),
          subject: providerMessage.subject,
          snippet: providerMessage.bodyText.slice(0, 500),
          status: matched ? 'MATCHED' : 'UNMATCHED',
          lastActivityAt: providerMessage.receivedAt,
        });
      if (!conversation || conversation.mailboxId !== input.mailboxId) throw new Error('EMAIL_CONVERSATION_NOT_FOUND');
      const message = await repository.createMessage({
        mailboxId: input.mailboxId,
        conversationId: conversation.id,
        direction: 'INBOUND',
        status: 'RECEIVED',
        providerMessageId: providerMessage.providerMessageId,
        ...(providerMessage.providerThreadId ? { providerThreadId: providerMessage.providerThreadId } : {}),
        ...(providerMessage.internetMessageId ? { internetMessageId: providerMessage.internetMessageId } : {}),
        ...(providerMessage.inReplyTo ? { inReplyTo: providerMessage.inReplyTo } : {}),
        ...(providerMessage.references ? { references: providerMessage.references } : {}),
        fromAddress: normalizedFrom,
        subject: providerMessage.subject,
        bodyText: providerMessage.bodyText,
        ...(providerMessage.bodyHtml ? { sanitizedHtml: sanitizeEmailHtml(providerMessage.bodyHtml) } : {}),
        sentOrReceivedAt: providerMessage.receivedAt,
        recipients: providerMessage.to.map((address) => ({ kind: 'TO' as const, address: normalizeEmailAddress(address) })),
        attachments: attachmentInputs,
      });
      await repository.createMatchDecision({ messageId: message.id, state: match.state, ...(matchedCandidateId ? { candidateId: matchedCandidateId } : {}), reason: match.reason });
      await repository.touchConversation(conversation.id, { status: matched ? 'MATCHED' : 'UNMATCHED', snippet: providerMessage.bodyText.slice(0, 500), lastActivityAt: providerMessage.receivedAt, ...(matchedCandidateId ? { candidateId: matchedCandidateId } : {}) });
      for (const attachment of message.attachments ?? []) {
        await this.outbox.append(transaction, {
          eventType: 'file.scan.requested',
          aggregateType: 'EMAIL_ATTACHMENT',
          aggregateId: attachment.id,
          idempotencyKey: `file.scan.requested:${attachment.id}`,
          correlationId: input.correlationId,
          payload: { attachmentId: attachment.id, messageId: message.id },
        });
      }
      if (input.cursor) await repository.advanceMailboxCursor(input.mailboxId, input.cursor);
      return { duplicate: false, messageId: message.id, match };
    });
  }

  async resolveMatch(input: {
    messageId: string;
    candidateId: string;
    reason: string;
    actorId: string;
    correlationId: string;
    teamId?: string;
    roles?: readonly ActorRole[];
    applicationId?: string;
    journeyId?: string;
  }) {
    if (this.config?.mail?.mode === 'NOTIFICATION_ONLY') {
      throw new EmailDomainError('EMAIL_INTERACTIVE_DISABLED', 'errors.emailInteractiveDisabled', 409);
    }
    if (!input.reason.trim()) throw new EmailDomainError('EMAIL_MATCH_REASON_REQUIRED', 'errors.emailMatchReasonRequired', 422);
    return this.repository.withTransaction(async (repository, transaction) => {
      const message = await repository.findMessage(input.messageId);
      if (!message) throw new EmailDomainError('EMAIL_MESSAGE_NOT_FOUND', 'errors.emailMessageNotFound', 404);
      if (message.direction !== 'INBOUND') throw new EmailDomainError('EMAIL_ACTION_NOT_ALLOWED', 'errors.emailActionNotAllowed', 409);
      const conversation = await repository.findConversation(message.conversationId);
      if (!conversation) throw new EmailDomainError('EMAIL_CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      if (conversation.candidateId) throw new EmailDomainError('EMAIL_CONVERSATION_ALREADY_MATCHED', 'errors.emailRequestRejected', 409);
      const candidate = await repository.findCandidateForLink(input.candidateId);
      if (!candidate || candidate.recordStatus !== 'ACTIVE') throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
      if (this.policy && input.roles) {
        this.policy.assert({
          actor: { userId: input.actorId, status: 'ACTIVE', teamId: input.teamId, roles: input.roles },
          action: 'email.manual_link',
          sensitivity: 'NORMAL',
          resource: { ownerUserId: candidate.ownerId, teamId: candidate.teamId ?? undefined },
        });
      }
      if (!await repository.linkConversationCandidateCas(conversation.id, input.candidateId, conversation.version, { applicationId: input.applicationId, journeyId: input.journeyId })) {
        throw new EmailDomainError('EMAIL_MESSAGE_VERSION_CONFLICT', 'errors.conflict', 409);
      }
      await repository.createMatchDecision({ messageId: message.id, state: 'RESOLVED', candidateId: input.candidateId, reason: input.reason.trim(), resolvedById: input.actorId });
      await this.audit.append(transaction, {
        actorUserId: input.actorId,
        action: 'EMAIL_MATCH_RESOLVED',
        entityType: 'EMAIL_MESSAGE',
        entityId: message.id,
        correlationId: input.correlationId,
        metadataJson: { candidateId: input.candidateId, conversationId: conversation.id, applicationId: input.applicationId ?? null, journeyId: input.journeyId ?? null },
      });
      await this.outbox.append(transaction, {
        eventType: 'email.match.resolved',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: message.id,
        idempotencyKey: `email.match.resolved:${message.id}:${input.candidateId}`,
        correlationId: input.correlationId,
        payload: { messageId: message.id, conversationId: conversation.id, candidateId: input.candidateId, ...(input.applicationId ? { applicationId: input.applicationId } : {}), ...(input.journeyId ? { journeyId: input.journeyId } : {}) },
      });
      return message;
    });
  }
}
