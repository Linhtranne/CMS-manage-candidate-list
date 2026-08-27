import { Inject, Injectable, Optional } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';
import type { EmailMessageStatus } from '../domain/email.types.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { TelemetryService } from '../../../platform/telemetry/telemetry.service.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import type { MailOperationalPolicy } from '../../../platform/config/config.schema.js';

export type SendFailureDisposition = Extract<EmailMessageStatus, 'RETRY_WAIT' | 'RECONCILING' | 'FAILED'>;

const DEFAULT_MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

export function computeRetryDelayMs(error: unknown, attempt: number, random: () => number = Math.random, now = Date.now(), policy?: Pick<MailOperationalPolicy, 'maxAttempts' | 'retryWindowSeconds'> | null): number {
  const maxAttempts = policy?.maxAttempts ?? 8;
  const maxRetryDelayMs = policy ? policy.retryWindowSeconds * 1000 : DEFAULT_MAX_RETRY_DELAY_MS;
  const boundedAttempt = Math.max(1, Math.min(maxAttempts, Math.floor(Number.isFinite(attempt) ? attempt : 1)));
  const exponential = Math.min(maxRetryDelayMs, 30_000 * (2 ** Math.min(boundedAttempt - 1, 7)));
  const jitterRatio = Math.min(0.2, Math.max(0, Number(random()) || 0));
  const jittered = exponential + Math.floor(exponential * jitterRatio);
  const retryAfter = retryAfterMs(error, now);
  return Math.min(maxRetryDelayMs, Math.max(jittered, retryAfter ?? 0));
}

export function classifySendFailure(error: unknown): SendFailureDisposition {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = String(candidate?.code ?? '').toUpperCase();
  const message = String(candidate?.message ?? error).toUpperCase();
  if (/TIMEOUT|CONNECTION_RESET|ECONNRESET|UNKNOWN_OUTCOME|AFTER REQUEST|NO RESPONSE/.test(code) || /TIMEOUT|CONNECTION RESET|AFTER REQUEST ACCEPTED|UNKNOWN OUTCOME/.test(message)) {
    return 'RECONCILING';
  }
  if (/RATE_LIMIT|HTTP_429|TEMPORARY|TRANSIENT|HTTP_5\d\d|ECONNREFUSED|NETWORK/.test(code) || /\b429\b|\b5\d\d\b|TEMPORARY|TRANSIENT/.test(message)) {
    return 'RETRY_WAIT';
  }
  return 'FAILED';
}

interface OutboundQueuePayload extends QueuePayload {
  eventType?: string;
  messageId?: string;
}

@Injectable()
export class SendEmailProcessor {
  constructor(
    private readonly repository: EmailPrismaRepository,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    @Inject(OutboxRepository) private readonly deliveryEvents: Pick<OutboxRepository, 'append'>,
    @Optional() private readonly telemetry?: TelemetryService,
    @Optional() @Inject(RUNTIME_CONFIG) private readonly config?: RuntimeConfig,
  ) {}

  async handle(payload: OutboundQueuePayload): Promise<void> {
    const messageId = payload.messageId ?? payload.entityId;
    if (!messageId) return;
    const message = await this.repository.findMessageForSend(messageId);
    if (!message || !['QUEUED', 'RETRY_WAIT'].includes(message.status)) return;
    if (!['HEALTHY', 'DEGRADED'].includes(message.mailbox.status)) {
      this.telemetry?.increment('email.send.kill_switch');
      return;
    }
    if (message.conversation.candidate?.contactabilityStatus === 'DO_NOT_CONTACT') {
      await this.repository.cancelBeforeSend(message.id);
      this.telemetry?.increment('email.send.do_not_contact');
      return;
    }
    if (!(await this.repository.claimForSend(messageId))) return;

    try {
      const recipients = message.recipients
        .filter((recipient) => recipient.kind === 'TO' || recipient.kind === 'CC' || recipient.kind === 'BCC')
        .sort((left, right) => left.position - right.position);
      const result = await this.provider.send({
        from: message.fromAddress,
        to: recipients.filter((recipient) => recipient.kind === 'TO').map((recipient) => recipient.address),
        cc: recipients.filter((recipient) => recipient.kind === 'CC').map((recipient) => recipient.address),
        bcc: recipients.filter((recipient) => recipient.kind === 'BCC').map((recipient) => recipient.address),
        subject: message.subject,
        bodyText: message.bodyText,
        ...(message.sanitizedHtml ? { sanitizedHtml: message.sanitizedHtml } : {}),
        headers: { 'X-CMS-Message-Id': message.id },
      }, `cms-email:${message.id}`);
      await this.repository.withTransaction(async (repository, transaction) => {
        if (!(await repository.markSent(message.id, result))) throw new Error('EMAIL_MESSAGE_VERSION_CONFLICT');
        await this.deliveryEvents.append(transaction, {
          eventType: 'email.sent',
          aggregateType: 'EMAIL_MESSAGE',
          aggregateId: message.id,
          idempotencyKey: `email.sent:${message.id}:${payload.eventId}`,
          correlationId: payload.correlationId,
          payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId },
        });
      });
      this.telemetry?.increment('email.send.success');
    } catch (error) {
      const disposition = classifySendFailure(error);
      const previousAttempt = typeof payload.attempt === 'number' && Number.isFinite(payload.attempt) ? payload.attempt : 0;
      const attempt = previousAttempt + 1;
      const policy = this.config?.mail.operationalPolicy;
      const maxAttempts = policy?.maxAttempts ?? 8;
      const effectiveDisposition: SendFailureDisposition = disposition === 'RETRY_WAIT' && attempt >= maxAttempts ? 'FAILED' : disposition;
      if (isAuthFailure(error)) {
        await this.repository.pauseMailboxAuth(message.mailboxId);
        this.telemetry?.increment('email.mailbox.auth_pause');
        console.error(JSON.stringify({ event: 'email_mailbox_auth_paused', mailboxId: message.mailboxId, code: 'AUTH_INVALID' }));
      }
      await this.repository.withTransaction(async (repository, transaction) => {
        if (!(await repository.markSendState(message.id, 'SENDING', effectiveDisposition))) return;
        await this.deliveryEvents.append(transaction, {
          eventType: effectiveDisposition === 'RECONCILING' ? 'email.send.uncertain' : effectiveDisposition === 'RETRY_WAIT' ? 'email.send.retry_wait' : 'email.failed',
          aggregateType: 'EMAIL_MESSAGE',
          aggregateId: message.id,
          idempotencyKey: `email.${effectiveDisposition.toLowerCase()}:${message.id}:${payload.eventId}`,
          correlationId: payload.correlationId,
          ...(effectiveDisposition === 'RETRY_WAIT' ? { availableAt: new Date(Date.now() + computeRetryDelayMs(error, attempt, Math.random, Date.now(), policy)) } : {}),
          payload: { messageId: message.id, mailboxId: message.mailboxId, conversationId: message.conversationId, disposition: effectiveDisposition, attempt },
        });
      });
      this.telemetry?.increment(`email.send.${effectiveDisposition.toLowerCase()}`);
    }
  }

  async handleOutbox(payload: OutboundQueuePayload): Promise<void> {
    if (payload.eventType !== 'email.send.requested' && payload.eventType !== 'email.send.retry_wait') return;
    await this.handle(payload);
  }
}

function isAuthFailure(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown };
  return /AUTH|CREDENTIAL|UNAUTHORIZED|FORBIDDEN/.test(`${String(candidate?.code ?? '')} ${String(candidate?.message ?? '')}`.toUpperCase());
}

function retryAfterMs(error: unknown, now: number): number | undefined {
  const candidate = error as { retryAfterMs?: unknown; retryAfterSeconds?: unknown; retryAfter?: unknown };
  if (typeof candidate.retryAfterMs === 'number' && Number.isFinite(candidate.retryAfterMs) && candidate.retryAfterMs >= 0) return candidate.retryAfterMs;
  if (typeof candidate.retryAfterSeconds === 'number' && Number.isFinite(candidate.retryAfterSeconds) && candidate.retryAfterSeconds >= 0) return candidate.retryAfterSeconds * 1000;
  if (typeof candidate.retryAfter !== 'string') return undefined;
  const seconds = Number(candidate.retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(candidate.retryAfter);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}
