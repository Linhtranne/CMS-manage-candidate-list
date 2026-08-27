import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EmailDomainError } from '../domain/email.types.js';
import { assertCanaryRecipients, normalizeRecipients, sanitizeEmailHtml } from '../domain/email.rules.js';
import { EmailPreviewService, emailPreviewRequestHash, type EmailPreviewRequest } from './email-preview.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { IdempotencyService } from '../../../platform/idempotency/idempotency.service.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { candidateBlindIndex } from '../../candidates/infrastructure/candidate.crypto.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { PolicyService } from '../../identity-access/application/policy.service.js';
import type { ActorRole } from '../../identity-access/domain/permission.registry.js';

export interface EmailCommandContext {
  actorId: string;
  correlationId: string;
  requestId?: string;
  teamId?: string;
  roles?: readonly ActorRole[];
}

export interface EmailActionContext extends EmailCommandContext {
  reason?: string;
  teamId?: string;
  roles?: readonly ActorRole[];
}

interface EmailActionMessage {
  id: string;
  direction: string;
  status: string;
  mailboxId: string;
  conversationId: string;
  version?: number;
  mailbox: { provider: string; status: string };
  conversation: { candidate?: { contactabilityStatus?: string; ownerId?: string; teamId?: string | null } | null };
}

export interface EnqueueEmailInput extends EmailPreviewRequest {
  previewToken: string;
  idempotencyKey: string;
  conversationId?: string;
  candidateId?: string;
  applicationId?: string;
  journeyId?: string;
  conversationVersion?: number;
}

export interface SendConversationInput {
  conversationId: string;
  to: readonly string[];
  cc?: readonly string[];
  subject: string;
  body: string;
  templateId?: string;
  attachmentIds?: readonly string[];
  idempotencyKey: string;
  version: number;
}

export interface EmailSendResult {
  messageId: string;
  status: 'QUEUED';
  queuedAt: string;
  conversationId: string;
}

@Injectable()
export class EmailCommandService {
  constructor(
    private readonly previews: EmailPreviewService,
    private readonly repository: EmailPrismaRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxRepository,
    private readonly audit: AuditWriter,
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
    @Optional() @Inject(RUNTIME_CONFIG) private readonly config?: RuntimeConfig,
    @Optional() private readonly policy?: PolicyService,
  ) {}

  async preview(input: EmailPreviewRequest & { candidateId?: string }, context?: EmailCommandContext) {
    this.assertInteractiveMode();
    const mailbox = await this.repository.findMailbox(input.mailboxId);
    if (!mailbox) throw new EmailDomainError('MAILBOX_NOT_FOUND', 'errors.mailboxNotFound', 404);
    const serverOwnedInput = { ...input, from: this.senderAddress(mailbox.address) };
    this.assertCanaryRecipients(serverOwnedInput.recipients);
    if (serverOwnedInput.candidateId) {
      const candidate = await this.prisma?.candidate.findUnique({ where: { id: serverOwnedInput.candidateId }, select: { id: true, contactabilityStatus: true, emailBlindIndex: true, ownerId: true, teamId: true } });
      if (!candidate) throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
      if (context?.roles) this.assertContextPolicy('email.send', context, { ownerUserId: candidate.ownerId, teamId: candidate.teamId ?? undefined });
      this.assertCandidateRecipients(serverOwnedInput, candidate.emailBlindIndex);
      return this.previews.create({
        ...serverOwnedInput,
        candidate: { id: candidate.id, contactabilityStatus: candidate.contactabilityStatus as 'CONTACTABLE' | 'TEMPORARILY_UNREACHABLE' | 'DO_NOT_CONTACT' },
      });
    }
    return this.previews.create(serverOwnedInput);
  }

  async enqueue(input: EnqueueEmailInput, context: EmailCommandContext): Promise<EmailSendResult> {
    this.assertInteractiveMode();
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 240) {
      throw new EmailDomainError('IDEMPOTENCY_KEY_REQUIRED', 'errors.idempotencyKeyRequired', 422);
    }
    this.previews.assertMatches(input.previewToken, input);
    await this.assertCandidateContactable(input.candidateId);
    await this.assertCandidateRecipientsFromStore(input);
    const recipients = normalizeRecipients(input.recipients);
    this.assertCanaryRecipients(recipients);
    const requestHash = createHash('sha256').update(JSON.stringify({
      previewRequestHash: emailPreviewRequestHash(input),
      conversationId: input.conversationId ?? null,
      candidateId: input.candidateId ?? null,
      applicationId: input.applicationId ?? null,
      journeyId: input.journeyId ?? null,
    })).digest('hex');
    const scopeKey = `email:enqueue:${context.actorId}:${input.idempotencyKey}`;
    return this.idempotency.runIdempotent(scopeKey, requestHash, async () => this.repository.withTransaction(async (repository, transaction) => {
      const mailbox = await repository.findMailbox(input.mailboxId);
      if (!mailbox) throw new EmailDomainError('MAILBOX_NOT_FOUND', 'errors.mailboxNotFound', 404);
      if (mailbox.provider === 'DISABLED' || mailbox.status === 'NOT_CONFIGURED') {
        throw new EmailDomainError('MAIL_PROVIDER_DISABLED', 'errors.mailProviderDisabled', 503);
      }
      if (['PAUSED_AUTH', 'PAUSED_OPERATOR', 'FAILED'].includes(mailbox.status)) {
        throw new EmailDomainError('MAILBOX_UNHEALTHY', 'errors.mailboxUnhealthy', 503);
      }
      if (input.candidateId && context.roles) {
        const candidate = await repository.findCandidateContactability(input.candidateId);
        if (!candidate) throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
        this.assertContextPolicy('email.send', context, { ownerUserId: candidate.ownerId, teamId: candidate.teamId ?? undefined });
      }
      await this.assertCandidateContactable(input.candidateId, repository);
      await this.assertCandidateRecipientsFromStore(input, repository);
      const conversation = input.conversationId
        ? await repository.findConversation(input.conversationId)
        : await repository.createConversation({
          mailboxId: mailbox.id,
          ...(input.candidateId ? { candidateId: input.candidateId } : {}),
          ...(input.applicationId ? { applicationId: input.applicationId } : {}),
          ...(input.journeyId ? { journeyId: input.journeyId } : {}),
          subject: input.subject,
          snippet: input.bodyText.slice(0, 500),
          lastActivityAt: new Date(),
        });
      if (!conversation || conversation.mailboxId !== mailbox.id) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      if (input.conversationVersion !== undefined && conversation.version !== input.conversationVersion) {
        throw new EmailDomainError('VERSION_CONFLICT', 'errors.conflict', 409);
      }
      const message = await repository.createMessage({
        mailboxId: mailbox.id,
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        idempotencyKey: input.idempotencyKey,
        // Preview signatures are an authorization boundary, but keep the
        // mailbox identity server-owned even if this service is called
        // outside the HTTP controller.
        fromAddress: this.senderAddress(mailbox.address),
        subject: input.subject,
        bodyText: input.bodyText,
        ...(input.sanitizedHtml ? { sanitizedHtml: sanitizeEmailHtml(input.sanitizedHtml) } : {}),
        sentOrReceivedAt: new Date(),
        recipients,
      });
      if (typeof repository.touchConversationOutbound === 'function') {
        await repository.touchConversationOutbound(conversation.id, { snippet: input.bodyText.slice(0, 500), lastActivityAt: message.sentOrReceivedAt });
      }
      await this.outbox.append(transaction, {
        eventType: 'email.send.requested',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: message.id,
        idempotencyKey: `email.send.requested:${message.id}`,
        correlationId: context.correlationId,
        payload: { messageId: message.id, mailboxId: mailbox.id, conversationId: conversation.id },
      });
      await this.audit.append(transaction, {
        actorUserId: context.actorId,
        action: 'EMAIL_ENQUEUED',
        entityType: 'EMAIL_MESSAGE',
        entityId: message.id,
        correlationId: context.correlationId,
        metadataJson: { mailboxId: mailbox.id, conversationId: conversation.id, requestId: context.requestId ?? null },
      });
      return { messageId: message.id, status: 'QUEUED', queuedAt: message.sentOrReceivedAt.toISOString(), conversationId: conversation.id };
    }));
  }

  async createDraft(input: {
    mailboxId: string;
    conversationId?: string;
    to: readonly string[];
    cc?: readonly string[];
    subject: string;
    body: string;
    candidateId?: string;
    applicationId?: string;
    journeyId?: string;
    idempotencyKey?: string;
    version?: number;
  }, context: EmailCommandContext) {
    this.assertInteractiveMode();
    const recipients = normalizeRecipients([
      ...input.to.map((address) => ({ kind: 'TO' as const, address })),
      ...(input.cc ?? []).map((address) => ({ kind: 'CC' as const, address })),
    ]);
    const create = () => this.repository.withTransaction(async (repository, transaction) => {
      const mailbox = await repository.findMailbox(input.mailboxId);
      if (!mailbox) throw new EmailDomainError('MAILBOX_NOT_FOUND', 'errors.mailboxNotFound', 404);

      const existing = input.conversationId ? await repository.findConversationForSend(input.conversationId) : null;
      if (input.conversationId && !existing) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      if (existing && existing.mailboxId !== mailbox.id) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      if (existing && input.version !== undefined && existing.version !== input.version) throw new EmailDomainError('VERSION_CONFLICT', 'errors.conflict', 409);
      if (existing?.candidate && input.candidateId && existing.candidate.id !== input.candidateId) {
        throw new EmailDomainError('EMAIL_CONVERSATION_CANDIDATE_CONFLICT', 'errors.conflict', 409);
      }

      const candidateId = input.candidateId ?? existing?.candidate?.id;
      const candidate = candidateId ? await repository.findCandidateContactability(candidateId) : null;
      if (candidateId && !candidate) throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
      if (candidate) {
        this.assertContextPolicy('email.send', context, { ownerUserId: candidate.ownerId, teamId: candidate.teamId ?? undefined });
        this.assertCandidateDraftContactable(candidateId, candidate);
        this.assertCandidateRecipients(recipients, candidate.emailBlindIndex);
      } else {
        this.assertContextPolicy('email.send', context, {});
      }

      const conversation = existing ?? await repository.createConversation({
        mailboxId: mailbox.id,
        ...(candidateId ? { candidateId } : {}),
        ...(input.applicationId ? { applicationId: input.applicationId } : {}),
        ...(input.journeyId ? { journeyId: input.journeyId } : {}),
        subject: input.subject,
        snippet: input.body.slice(0, 500),
        status: candidateId ? 'MATCHED' : 'NEEDS_ACTION',
        lastActivityAt: new Date(),
      });
      if (!conversation || conversation.mailboxId !== mailbox.id) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      const message = await repository.createMessage({
        mailboxId: mailbox.id,
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'DRAFT',
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        fromAddress: this.senderAddress(mailbox.address),
        subject: input.subject,
        bodyText: input.body,
        sentOrReceivedAt: new Date(),
        recipients,
      });
      if (typeof repository.touchConversationOutbound === 'function') {
        await repository.touchConversationOutbound(conversation.id, { snippet: input.body.slice(0, 500), lastActivityAt: message.sentOrReceivedAt });
      }
      await this.audit.append(transaction, {
        actorUserId: context.actorId,
        action: 'EMAIL_DRAFT_CREATED',
        entityType: 'EMAIL_MESSAGE',
        entityId: message.id,
        correlationId: context.correlationId,
        metadataJson: { mailboxId: mailbox.id, conversationId: conversation.id, requestId: context.requestId ?? null },
      });
      return message;
    });
    if (!input.idempotencyKey) return create();
    const requestHash = createHash('sha256').update(JSON.stringify({
      mailboxId: input.mailboxId,
      conversationId: input.conversationId ?? null,
      to: input.to,
      cc: input.cc ?? [],
      subject: input.subject,
      body: input.body,
      candidateId: input.candidateId ?? null,
      applicationId: input.applicationId ?? null,
      journeyId: input.journeyId ?? null,
      version: input.version ?? null,
    })).digest('hex');
    return this.idempotency.runIdempotent(`email:draft:${context.actorId}:${input.idempotencyKey}`, requestHash, create);
  }

  async sendConversation(input: SendConversationInput, context: EmailCommandContext): Promise<EmailSendResult> {
    this.assertInteractiveMode();
    const conversation = await this.repository.findConversationForSend(input.conversationId);
    if (!conversation) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
    if (conversation.version !== input.version) throw new EmailDomainError('VERSION_CONFLICT', 'errors.conflict', 409);
    if (!conversation.candidate) throw new EmailDomainError('EMAIL_CONVERSATION_NOT_MATCHED', 'errors.emailRequestRejected', 409);
    this.assertContextPolicy('email.send', context, { ownerUserId: conversation.candidate.ownerId, teamId: conversation.candidate.teamId ?? undefined });
    const attachmentIds = [...(input.attachmentIds ?? [])];
    const attachments = await this.repository.findAttachmentsForPreview(attachmentIds, input.conversationId);
    if (attachments.length !== attachmentIds.length || attachments.some((attachment) => attachment.status !== 'SAFE')) {
      throw new EmailDomainError('ATTACHMENT_NOT_SAFE', 'errors.attachmentNotSafe', 422);
    }
    const recipients = [
      ...input.to.map((address) => ({ kind: 'TO' as const, address })),
      ...(input.cc ?? []).map((address) => ({ kind: 'CC' as const, address })),
    ];
    const previewRequest: EmailPreviewRequest = {
      mailboxId: conversation.mailboxId,
      from: this.senderAddress(conversation.mailbox.address),
      recipients,
      subject: input.subject,
      bodyText: input.body,
      ...(input.templateId ? { templateId: input.templateId } : {}),
      conversationId: input.conversationId,
      candidateId: conversation.candidate.id,
      ...(conversation.applicationId ? { applicationId: conversation.applicationId } : {}),
      ...(conversation.journeyId ? { journeyId: conversation.journeyId } : {}),
      candidate: { id: conversation.candidate.id, contactabilityStatus: conversation.candidate.contactabilityStatus as 'CONTACTABLE' | 'TEMPORARILY_UNREACHABLE' | 'DO_NOT_CONTACT' },
      ...(attachmentIds.length ? { attachments: attachmentIds.map((id) => ({ id, status: 'SAFE' as const })) } : {}),
    };
    const preview = this.previews.create(previewRequest);
    return this.enqueue({ ...previewRequest, previewToken: preview.token, idempotencyKey: input.idempotencyKey, conversationVersion: input.version }, context);
  }

  async linkConversation(conversationId: string, input: { candidateId: string; applicationId?: string | null; journeyId?: string | null; version: number }, context: EmailActionContext) {
    this.assertInteractiveMode();
    return this.repository.withTransaction(async (repository, transaction) => {
      const conversation = await repository.findConversationForLink(conversationId);
      if (!conversation) throw new EmailDomainError('CONVERSATION_NOT_FOUND', 'errors.conversationNotFound', 404);
      if (conversation.candidateId) throw new EmailDomainError('EMAIL_CONVERSATION_ALREADY_MATCHED', 'errors.emailRequestRejected', 409);
      if (conversation.version !== input.version) throw new EmailDomainError('VERSION_CONFLICT', 'errors.conflict', 409);
      const candidate = await repository.findCandidateForLink(input.candidateId);
      if (!candidate || candidate.recordStatus !== 'ACTIVE') throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
      this.assertContextPolicy('email.manual_link', context, { ownerUserId: candidate.ownerId, teamId: candidate.teamId ?? undefined });
      if (!await repository.linkConversationCandidateCas(conversationId, input.candidateId, input.version, { applicationId: input.applicationId, journeyId: input.journeyId })) {
        throw new EmailDomainError('VERSION_CONFLICT', 'errors.conflict', 409);
      }
      await this.outbox.append(transaction, {
        eventType: 'email.match.resolved',
        aggregateType: 'EMAIL_CONVERSATION',
        aggregateId: conversationId,
        idempotencyKey: `email.match.resolved:${conversationId}:${input.candidateId}:${input.version + 1}`,
        correlationId: context.correlationId,
        payload: { conversationId, candidateId: input.candidateId, ...(input.applicationId ? { applicationId: input.applicationId } : {}), ...(input.journeyId ? { journeyId: input.journeyId } : {}) },
      });
      await this.audit.append(transaction, {
        actorUserId: context.actorId,
        action: 'EMAIL_MATCH_RESOLVED',
        entityType: 'EMAIL_CONVERSATION',
        entityId: conversationId,
        correlationId: context.correlationId,
        metadataJson: { candidateId: input.candidateId, applicationId: input.applicationId ?? null, journeyId: input.journeyId ?? null, requestId: context.requestId ?? null },
      });
      return repository.findConversationSummary(conversationId);
    });
  }

  async cancel(messageId: string, context: EmailActionContext) {
    return this.repository.withTransaction(async (repository, transaction) => {
      const message = await repository.findMessageForSend(messageId);
      this.assertOutboundActionMessage(message);
      this.assertMessagePolicy(message, context);
      if (message.status === 'RECONCILING') {
        throw new EmailDomainError('EMAIL_SEND_UNCERTAIN', 'errors.emailSendUncertain', 409);
      }
      if (!['QUEUED', 'RETRY_WAIT'].includes(message.status)) {
        throw new EmailDomainError('EMAIL_ALREADY_TERMINAL', 'errors.emailAlreadyTerminal', 409);
      }
      if (!await repository.cancelBeforeSend(messageId)) {
        throw new EmailDomainError('EMAIL_MESSAGE_VERSION_CONFLICT', 'errors.conflict', 409);
      }
      const updated = await repository.findMessage(messageId);
      await this.outbox.append(transaction, {
        eventType: 'email.cancelled',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: messageId,
        idempotencyKey: `email.cancelled:${messageId}:${message.version ?? 1}`,
        correlationId: context.correlationId,
        payload: { messageId, mailboxId: message.mailboxId, conversationId: message.conversationId },
      });
      await this.audit.append(transaction, {
        actorUserId: context.actorId,
        action: 'EMAIL_CANCELLED',
        entityType: 'EMAIL_MESSAGE',
        entityId: messageId,
        correlationId: context.correlationId,
        metadataJson: { mailboxId: message.mailboxId, conversationId: message.conversationId, reason: context.reason?.trim().slice(0, 1000) ?? null, requestId: context.requestId ?? null },
      });
      return updated;
    });
  }

  async retry(messageId: string, context: EmailActionContext) {
    return this.repository.withTransaction(async (repository, transaction) => {
      const message = await repository.findMessageForSend(messageId);
      this.assertOutboundActionMessage(message);
      this.assertMessagePolicy(message, context);
      if (message.status === 'RECONCILING') {
        throw new EmailDomainError('EMAIL_SEND_UNCERTAIN', 'errors.emailSendUncertain', 409);
      }
      if (message.status !== 'FAILED') {
        throw new EmailDomainError('EMAIL_RETRY_NOT_ALLOWED', 'errors.emailRetryNotAllowed', 409);
      }
      if (message.mailbox.provider === 'DISABLED' || message.mailbox.status === 'NOT_CONFIGURED') {
        throw new EmailDomainError('MAIL_PROVIDER_DISABLED', 'errors.mailProviderDisabled', 503);
      }
      if (!['HEALTHY', 'DEGRADED'].includes(message.mailbox.status)) {
        throw new EmailDomainError('MAILBOX_UNHEALTHY', 'errors.mailboxUnhealthy', 503);
      }
      if (message.conversation.candidate?.contactabilityStatus === 'DO_NOT_CONTACT') {
        throw new EmailDomainError('DO_NOT_CONTACT', 'errors.doNotContact', 422);
      }
      if (!await repository.retryFailed(messageId)) {
        throw new EmailDomainError('EMAIL_MESSAGE_VERSION_CONFLICT', 'errors.conflict', 409);
      }
      const updated = await repository.findMessage(messageId);
      await this.outbox.append(transaction, {
        eventType: 'email.send.requested',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: messageId,
        idempotencyKey: `email.send.requested:retry:${messageId}:${message.version ?? 1}`,
        correlationId: context.correlationId,
        payload: { messageId, mailboxId: message.mailboxId, conversationId: message.conversationId },
      });
      await this.audit.append(transaction, {
        actorUserId: context.actorId,
        action: 'EMAIL_RETRY_REQUESTED',
        entityType: 'EMAIL_MESSAGE',
        entityId: messageId,
        correlationId: context.correlationId,
        metadataJson: { mailboxId: message.mailboxId, conversationId: message.conversationId, reason: context.reason?.trim().slice(0, 1000) ?? null, requestId: context.requestId ?? null },
      });
      return updated;
    });
  }

  private assertOutboundActionMessage(message: EmailActionMessage | null): asserts message is EmailActionMessage {
    if (!message) throw new EmailDomainError('EMAIL_MESSAGE_NOT_FOUND', 'errors.emailMessageNotFound', 404);
    if (message.direction !== 'OUTBOUND') throw new EmailDomainError('EMAIL_ACTION_NOT_ALLOWED', 'errors.emailActionNotAllowed', 409);
  }

  private assertContextPolicy(action: 'email.send' | 'email.manual_link', context: EmailCommandContext, resource: { ownerUserId?: string; teamId?: string }): void {
    if (!this.policy || !context.roles) return;
    this.policy.assert({ actor: { userId: context.actorId, status: 'ACTIVE', teamId: context.teamId, roles: context.roles }, action, sensitivity: 'NORMAL', resource });
  }

  private assertMessagePolicy(message: EmailActionMessage, context: EmailActionContext): void {
    if (!this.policy || !context.roles) return;
    this.policy.assert({
      actor: { userId: context.actorId, status: 'ACTIVE', teamId: context.teamId, roles: context.roles },
      action: 'email.retry',
      sensitivity: 'NORMAL',
      resource: {
        ownerUserId: message.conversation.candidate?.ownerId,
        teamId: message.conversation.candidate?.teamId ?? undefined,
      },
    });
  }

  private async assertCandidateContactable(candidateId?: string, repository?: EmailPrismaRepository): Promise<void> {
    if (!candidateId) return;
    const candidate = repository
      ? await repository.findCandidateContactability(candidateId)
      : this.prisma
        ? await this.prisma.candidate.findUnique({ where: { id: candidateId }, select: { contactabilityStatus: true, emailBlindIndex: true } })
        : null;
    if (!candidate) throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
    if (candidate.contactabilityStatus === 'DO_NOT_CONTACT') throw new EmailDomainError('DO_NOT_CONTACT', 'errors.doNotContact', 422);
    if (candidate.contactabilityStatus === 'TEMPORARILY_UNREACHABLE') throw new EmailDomainError('CANDIDATE_NOT_CONTACTABLE', 'errors.candidateNotContactable', 422);
  }

  private async assertCandidateRecipientsFromStore(input: EnqueueEmailInput, repository?: EmailPrismaRepository): Promise<void> {
    if (!input.candidateId) return;
    const candidate = repository
      ? await repository.findCandidateContactability(input.candidateId)
      : this.prisma
        ? await this.prisma.candidate.findUnique({ where: { id: input.candidateId }, select: { emailBlindIndex: true } })
        : null;
    if (!candidate) throw new EmailDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
    this.assertCandidateRecipients(input, candidate.emailBlindIndex);
  }

  private assertCandidateRecipients(input: EmailPreviewRequest | readonly { kind: 'TO' | 'CC' | 'BCC'; address: string }[], emailBlindIndex: string | null): void {
    if (!emailBlindIndex) throw new EmailDomainError('EMAIL_RECIPIENT_NOT_ALLOWED', 'errors.emailRecipientNotAllowed', 422);
    const secret = this.config?.security.encryptionKey;
    if (!secret) throw new EmailDomainError('EMAIL_RECIPIENT_NOT_ALLOWED', 'errors.emailRecipientNotAllowed', 422);
    const recipients = 'recipients' in input ? input.recipients : input;
    const matchesCandidate = recipients.some((recipient) => candidateBlindIndex(recipient.address.trim().toLowerCase(), secret) === emailBlindIndex);
    if (!matchesCandidate) throw new EmailDomainError('EMAIL_RECIPIENT_NOT_ALLOWED', 'errors.emailRecipientNotAllowed', 422);
  }

  private assertCandidateDraftContactable(candidateId: string | undefined, candidate: { contactabilityStatus: string }): void {
    if (!candidateId) return;
    if (candidate.contactabilityStatus === 'DO_NOT_CONTACT') throw new EmailDomainError('DO_NOT_CONTACT', 'errors.doNotContact', 422);
    if (candidate.contactabilityStatus === 'TEMPORARILY_UNREACHABLE') throw new EmailDomainError('CANDIDATE_NOT_CONTACTABLE', 'errors.candidateNotContactable', 422);
  }

  private assertCanaryRecipients(recipients: readonly { address: string }[]): void {
    const mail = this.config?.mail;
    if (!mail) return;
    assertCanaryRecipients(recipients, mail.canaryOnly, mail.canaryRecipients);
  }

  private assertInteractiveMode(): void {
    if (this.config?.mail?.mode === 'NOTIFICATION_ONLY') {
      throw new EmailDomainError('EMAIL_INTERACTIVE_DISABLED', 'errors.emailInteractiveDisabled', 409);
    }
  }

  private senderAddress(mailboxAddress: string): string {
    return this.config?.mail?.senderAddress ?? mailboxAddress;
  }
}
