import { createTransport } from 'nodemailer';
import type { SendMailOptions, SentMessageInfo } from 'nodemailer';
import { Readable } from 'node:stream';
import { MailProviderError, type MailProviderAdapter } from './mail-provider.port.js';
import type {
  MailCursor,
  ProviderChangePage,
  ProviderHealth,
  ProviderMessage,
  ProviderSendInput,
  ProviderSendResult,
} from '../../domain/email.types.js';

export interface SesSmtpConfig {
  endpoint: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export interface SesSmtpTransport {
  verify(): Promise<unknown>;
  sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
}

/**
 * Amazon SES SMTP transport used for DEC-003 notification mail.
 *
 * SMTP is intentionally outbound-only here. Inbound sync, message fetch and
 * attachment fetch require a separate receiving integration and are disabled
 * by the notification-only mail contract.
 */
export class SesSmtpMailProviderAdapter implements MailProviderAdapter {
  readonly provider = 'SMTP_IMAP' as const;
  private readonly transport: SesSmtpTransport;

  constructor(private readonly config: SesSmtpConfig, transport?: SesSmtpTransport) {
    this.transport = transport ?? createTransport({
      host: config.endpoint,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: { user: config.username, pass: config.password },
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  async validateConnection(): Promise<ProviderHealth> {
    try {
      await this.transport.verify();
      return { provider: this.provider, status: 'healthy', checkedAt: new Date() };
    } catch (error) {
      throw this.toProviderError(error, 'MAIL_PROVIDER_HEALTH_CHECK_FAILED');
    }
  }

  async send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> {
    try {
      const result = await this.transport.sendMail({
        from: input.from,
        to: [...input.to],
        ...(input.cc?.length ? { cc: [...input.cc] } : {}),
        ...(input.bcc?.length ? { bcc: [...input.bcc] } : {}),
        subject: input.subject,
        text: input.bodyText,
        ...(input.sanitizedHtml ? { html: input.sanitizedHtml } : {}),
        headers: {
          ...(input.headers ?? {}),
          'X-CMS-Idempotency-Key': idempotencyKey,
        },
      });
      const providerMessageId = result.messageId?.trim();
      if (!providerMessageId) throw new MailProviderError('MAIL_PROVIDER_RESPONSE_INVALID');
      return {
        providerMessageId,
        internetMessageId: providerMessageId,
        acceptedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof MailProviderError) throw error;
      throw this.toProviderError(error, 'MAIL_PROVIDER_SEND_FAILED');
    }
  }

  async fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> {
    void cursor;
    void limit;
    throw new MailProviderError('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
  }

  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> {
    void providerMessageId;
    throw new MailProviderError('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
  }

  async fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable> {
    void providerMessageId;
    void attachmentId;
    throw new MailProviderError('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
  }

  private toProviderError(error: unknown, fallbackCode: string): MailProviderError {
    const candidate = error as { code?: unknown; responseCode?: unknown; message?: unknown };
    const code = String(candidate?.code ?? '').toUpperCase();
    const message = String(candidate?.message ?? '').toUpperCase();
    const responseCode = Number(candidate?.responseCode);
    if (code.includes('AUTH') || code.includes('EAUTH') || message.includes('AUTHENTICATION') || message.includes('CREDENTIAL') || responseCode === 535 || responseCode === 530) {
      return new MailProviderError('MAIL_PROVIDER_AUTH_FAILED');
    }
    if (code.includes('TIMEOUT') || code.includes('ECONNRESET') || code.includes('ECONNREFUSED') || code.includes('ETIMEDOUT') || message.includes('TIMEOUT') || message.includes('CONNECTION RESET')) {
      return new MailProviderError('MAIL_PROVIDER_NETWORK_ERROR');
    }
    if (responseCode === 421 || responseCode === 450 || responseCode === 451 || responseCode === 452 || code.includes('RATE') || message.includes('TEMPORARY') || message.includes('RATE LIMIT')) {
      return new MailProviderError('MAIL_PROVIDER_TEMPORARY_FAILURE');
    }
    return new MailProviderError(fallbackCode);
  }
}
