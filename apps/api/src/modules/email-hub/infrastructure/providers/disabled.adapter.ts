import { MailProviderError, type MailProviderAdapter } from './mail-provider.port.js';
import type { MailCursor, ProviderChangePage, ProviderHealth, ProviderMessage, ProviderSendInput, ProviderSendResult } from '../../domain/email.types.js';
import type { Readable } from 'node:stream';

export class DisabledMailProviderAdapter implements MailProviderAdapter {
  readonly provider = 'DISABLED' as const;

  async validateConnection(): Promise<ProviderHealth> {
    return { provider: this.provider, status: 'not_configured', checkedAt: new Date(), detail: 'MAIL_PROVIDER=DISABLED' };
  }

  async send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> {
    void input;
    void idempotencyKey;
    throw new MailProviderError('MAIL_PROVIDER_DISABLED');
  }

  async fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> {
    void cursor;
    void limit;
    throw new MailProviderError('MAIL_PROVIDER_DISABLED');
  }

  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> {
    void providerMessageId;
    throw new MailProviderError('MAIL_PROVIDER_DISABLED');
  }

  async fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable> {
    void providerMessageId;
    void attachmentId;
    throw new MailProviderError('MAIL_PROVIDER_DISABLED');
  }
}
