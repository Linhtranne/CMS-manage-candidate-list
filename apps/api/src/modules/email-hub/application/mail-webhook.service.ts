import { Injectable } from '@nestjs/common';
import { EmailDomainError, EXTERNAL_MAILBOX_PROVIDERS, type ExternalMailboxProvider } from '../domain/email.types.js';
import { assertWebhookSignature } from './email-matcher.service.js';
import type { QueuePayload, QueueService } from '../../../platform/queue/queue.service.js';

export interface MailWebhookInput {
  provider: ExternalMailboxProvider;
  mailboxId: string;
  notificationId: string;
  providerMessageId: string;
  signature: string;
}

export interface MailWebhookReplayRepository {
  findMailbox(id: string): Promise<{ provider: string } | null>;
  claimWebhookNotification(input: { provider: ExternalMailboxProvider; mailboxId: string; notificationId: string; providerMessageId?: string; expiresAt: Date }): Promise<boolean>;
}

@Injectable()
export class MailWebhookService {
  constructor(
    private readonly secret: string,
    private readonly repository: MailWebhookReplayRepository,
    private readonly queue: Pick<QueueService, 'enqueue'> & { enabled?: boolean },
    private readonly now: () => Date = () => new Date(),
    private readonly providerEnabled: () => boolean = () => true,
  ) {}

  signingValue(input: Pick<MailWebhookInput, 'provider' | 'mailboxId' | 'notificationId' | 'providerMessageId'>): string {
    return `${input.provider}:${input.mailboxId}:${input.notificationId}:${input.providerMessageId}`;
  }

  async handle(input: MailWebhookInput): Promise<{ duplicate: boolean }> {
    if (!(EXTERNAL_MAILBOX_PROVIDERS as readonly string[]).includes(input.provider)) {
      throw new EmailDomainError('MAIL_PROVIDER_DISABLED', 'errors.mailProviderDisabled', 503);
    }
    if (!this.providerEnabled()) throw new EmailDomainError('MAIL_PROVIDER_DISABLED', 'errors.mailProviderDisabled', 503);
    if (this.queue.enabled === false) throw new EmailDomainError('MAIL_PROVIDER_DISABLED', 'errors.mailProviderDisabled', 503);
    assertWebhookSignature(this.secret, this.signingValue(input), input.signature);
    const mailbox = await this.repository.findMailbox(input.mailboxId);
    // Do not reveal whether a mailbox exists or which provider it uses.
    if (!mailbox || mailbox.provider !== input.provider) {
      throw new EmailDomainError('MAIL_WEBHOOK_INVALID', 'errors.mailWebhookInvalid', 401);
    }
    const claimed = await this.repository.claimWebhookNotification({
      provider: input.provider,
      mailboxId: input.mailboxId,
      notificationId: input.notificationId,
      providerMessageId: input.providerMessageId,
      expiresAt: new Date(this.now().getTime() + 24 * 60 * 60 * 1000),
    });
    if (!claimed) return { duplicate: true };
    const payload: QueuePayload = {
      schemaVersion: 1,
      eventId: `mail-webhook:${input.provider}:${input.notificationId}`,
      correlationId: `mail-webhook:${input.notificationId}`,
      entityId: input.providerMessageId,
      provider: input.provider,
      mailboxId: input.mailboxId,
      notificationId: input.notificationId,
      providerMessageId: input.providerMessageId,
    };
    await this.queue.enqueue('mail-ingest', payload);
    return { duplicate: false };
  }
}
