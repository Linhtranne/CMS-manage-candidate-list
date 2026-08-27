import type {
  MailCursor,
  ProviderChangePage,
  ProviderHealth,
  ProviderMessage,
  ProviderSendInput,
  ProviderSendResult,
  ProviderSendLookup,
  MailboxProvider,
} from '../../domain/email.types.js';
import type { Readable } from 'node:stream';

export const MAIL_PROVIDER_ADAPTER = Symbol('MAIL_PROVIDER_ADAPTER');

export interface MailProviderAdapter {
  readonly provider: MailboxProvider;
  validateConnection(): Promise<ProviderHealth>;
  send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult>;
  findByClientReference?(clientReference: string): Promise<ProviderSendLookup | null>;
  fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage>;
  fetchMessage(providerMessageId: string): Promise<ProviderMessage>;
  fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable>;
  renewSubscription?(subscriptionId: string): Promise<{ subscriptionId: string; expiresAt: Date }>;
}

export class MailProviderError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, statusCode = 503) {
    super(code);
    this.name = 'MailProviderError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
