import type { Readable } from 'node:stream';
import type { MailCursor, ProviderChangePage, ProviderHealth, ProviderMessage, ProviderSendInput, ProviderSendLookup, ProviderSendResult, MailboxProvider } from '../../domain/email.types.js';
import type { MailProviderAdapter } from './mail-provider.port.js';
import type { MailOperationLimiter } from './mail-provider-rate-limiter.js';

/** Applies the approved DEC-003 quota/concurrency policy to every SDK call. */
export class RateLimitedMailProviderAdapter implements MailProviderAdapter {
  constructor(private readonly delegate: MailProviderAdapter, private readonly limiter: MailOperationLimiter) {}

  get provider(): MailboxProvider { return this.delegate.provider; }
  validateConnection(): Promise<ProviderHealth> { return this.limiter.run('validateConnection', () => this.delegate.validateConnection()); }
  send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> { return this.limiter.run('send', () => this.delegate.send(input, idempotencyKey)); }
  findByClientReference(clientReference: string): Promise<ProviderSendLookup | null> { return this.limiter.run('findByClientReference', () => this.delegate.findByClientReference?.(clientReference) ?? Promise.resolve(null)); }
  fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> { return this.limiter.run('fetchChanges', () => this.delegate.fetchChanges(cursor, limit)); }
  fetchMessage(providerMessageId: string): Promise<ProviderMessage> { return this.limiter.run('fetchMessage', () => this.delegate.fetchMessage(providerMessageId)); }
  fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable> { return this.limiter.run('fetchAttachment', () => this.delegate.fetchAttachment(providerMessageId, attachmentId)); }
  renewSubscription(subscriptionId: string): Promise<{ subscriptionId: string; expiresAt: Date }> {
    return this.limiter.run('renewSubscription', () => this.delegate.renewSubscription?.(subscriptionId) ?? Promise.reject(new Error('MAIL_PROVIDER_SUBSCRIPTION_UNSUPPORTED')));
  }
}

