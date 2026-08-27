import { Inject, Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { decryptCandidateValue } from '../../candidates/infrastructure/candidate.crypto.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';

const STATUS_NOTIFICATION_EVENTS = new Set([
  'application.created',
  'application.status_changed',
  'application.passed',
  'interview.scheduled',
  'interview.rescheduled',
  'interview.completed',
  'interview.cancelled',
]);

type NotificationContext = {
  candidateId: string;
  candidateName: string;
  candidateEmailCiphertext: string | null;
  contactabilityStatus: string;
  applicationId: string;
  jobPosition: string;
  subject: string;
  bodyText: string;
};

/**
 * Converts approved domain status events into immutable outbound notification
 * messages. It deliberately does not read replies or expose a Reply-To path.
 */
@Injectable()
export class StatusNotificationProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: EmailPrismaRepository,
    private readonly outbox: OutboxRepository,
    private readonly audit: AuditWriter,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  async handle(payload: QueuePayload): Promise<void> {
    if (this.config.mail.mode !== 'NOTIFICATION_ONLY' || !this.config.mail.enabled) return;
    const eventType = typeof payload.eventType === 'string' ? payload.eventType : '';
    if (!STATUS_NOTIFICATION_EVENTS.has(eventType)) return;
    if (eventType === 'application.status_changed' && payload.reason === 'INTERVIEW_SCHEDULED') return;

    const context = await this.loadContext(eventType, payload.entityId, payload);
    if (!context) return;
    let recipient: string | undefined;
    try {
      recipient = decryptCandidateValue(context.candidateEmailCiphertext, this.config.security.encryptionKey)?.trim().toLowerCase();
    } catch {
      // A malformed ciphertext must not poison the outbox worker. The record
      // remains non-contactable until an operator repairs the candidate data.
      return;
    }
    if (!recipient || !isEmail(recipient) || context.contactabilityStatus !== 'CONTACTABLE') return;

    const senderAddress = this.config.mail.senderAddress;
    const mailbox = await this.prisma.mailbox.findFirst({
      where: {
        ...(senderAddress ? { address: senderAddress } : {}),
        provider: { not: 'DISABLED' },
        status: { in: ['HEALTHY', 'DEGRADED'] },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    if (!mailbox) return;

    const idempotencyKey = `status-notification:${payload.eventId}`;
    await this.repository.withTransaction(async (repository, transaction) => {
      const existing = await transaction.emailMessage.findFirst({ where: { mailboxId: mailbox.id, idempotencyKey }, select: { id: true } });
      if (existing) return;

      const conversation = await transaction.emailConversation.findFirst({
        where: { mailboxId: mailbox.id, candidateId: context.candidateId, applicationId: context.applicationId },
        orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
      }) ?? await repository.createConversation({
        mailboxId: mailbox.id,
        candidateId: context.candidateId,
        applicationId: context.applicationId,
        subject: context.subject,
        snippet: context.bodyText.slice(0, 500),
        status: 'MATCHED',
        lastActivityAt: new Date(),
      });

      const message = await repository.createMessage({
        mailboxId: mailbox.id,
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        idempotencyKey,
        fromAddress: this.config.mail.senderAddress ?? mailbox.address,
        subject: context.subject,
        bodyText: context.bodyText,
        sentOrReceivedAt: new Date(),
        recipients: [{ kind: 'TO', address: recipient }],
      });
      await repository.touchConversationOutbound(conversation.id, { snippet: context.bodyText.slice(0, 500), lastActivityAt: message.sentOrReceivedAt });
      await this.outbox.append(transaction, {
        eventType: 'email.send.requested',
        aggregateType: 'EMAIL_MESSAGE',
        aggregateId: message.id,
        idempotencyKey: `email.send.requested:${message.id}`,
        correlationId: payload.correlationId,
        payload: { messageId: message.id, mailboxId: mailbox.id, conversationId: conversation.id },
      });
      await this.audit.append(transaction, {
        actorUserId: null,
        action: 'EMAIL_STATUS_NOTIFICATION_ENQUEUED',
        entityType: 'EMAIL_MESSAGE',
        entityId: message.id,
        correlationId: payload.correlationId,
        metadataJson: { sourceEventType: eventType, applicationId: context.applicationId, candidateId: context.candidateId },
      });
    });
  }

  private async loadContext(eventType: string, entityId: string, payload: QueuePayload): Promise<NotificationContext | null> {
    const application = eventType.startsWith('application.')
      ? await this.prisma.application.findUnique({
        where: { id: entityId },
        select: { id: true, status: true, candidate: { select: { id: true, name: true, emailCiphertext: true, contactabilityStatus: true } }, jobOrder: { select: { position: true } } },
      })
      : (await this.prisma.interview.findUnique({
        where: { id: entityId },
        select: { id: true, applicationId: true, scheduledAt: true, scheduledEndAt: true, timeZone: true, mode: true, meetingUrl: true, location: true, scheduleStatus: true, result: true, application: { select: { id: true, status: true, candidate: { select: { id: true, name: true, emailCiphertext: true, contactabilityStatus: true } }, jobOrder: { select: { position: true } } } } },
      }))?.application ?? null;
    if (!application) return null;

    const candidateName = application.candidate.name;
    const position = application.jobOrder.position;
    const status = typeof payload.toStatus === 'string' ? payload.toStatus : application.status;
    if (eventType === 'application.created') {
      return this.context(application, `Hồ sơ ứng tuyển đã được tiếp nhận`, `Xin chào ${candidateName},\n\nHồ sơ ứng tuyển cho vị trí ${position} đã được tiếp nhận và đang được xử lý.`);
    }
    if (eventType === 'application.status_changed' || eventType === 'application.passed') {
      return this.context(application, `Cập nhật hồ sơ ứng tuyển`, `Xin chào ${candidateName},\n\nHồ sơ ứng tuyển cho vị trí ${position} đã được cập nhật sang trạng thái: ${status}.`);
    }

    const interview = await this.prisma.interview.findUnique({ where: { id: entityId }, select: { scheduledAt: true, scheduledEndAt: true, timeZone: true, mode: true, meetingUrl: true, location: true, scheduleStatus: true, result: true } });
    if (!interview) return null;
    const schedule = `${interview.scheduledAt.toISOString()} – ${interview.scheduledEndAt.toISOString()} (${interview.timeZone})`;
    const detail = interview.mode === 'ONLINE' ? `Hình thức: trực tuyến${interview.meetingUrl ? `\nLink: ${interview.meetingUrl}` : ''}` : `Địa điểm: ${interview.location ?? 'sẽ được thông báo'}`;
    const subject = eventType === 'interview.scheduled' ? 'Lịch phỏng vấn' : eventType === 'interview.rescheduled' ? 'Cập nhật lịch phỏng vấn' : eventType === 'interview.cancelled' ? 'Lịch phỏng vấn đã hủy' : 'Cập nhật kết quả phỏng vấn';
    const body = `Xin chào ${candidateName},\n\n${subject} cho vị trí ${position}.\n${schedule}\n${detail}\n\nĐây là email tự động, vui lòng không trả lời email này.`;
    return this.context(application, subject, body);
  }

  private context(application: { id: string; candidate: { id: string; name: string; emailCiphertext: string | null; contactabilityStatus: string }; jobOrder: { position: string } }, subject: string, bodyText: string): NotificationContext {
    return { candidateId: application.candidate.id, candidateName: application.candidate.name, candidateEmailCiphertext: application.candidate.emailCiphertext, contactabilityStatus: application.candidate.contactabilityStatus, applicationId: application.id, jobPosition: application.jobOrder.position, subject, bodyText };
  }
}

function isEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
