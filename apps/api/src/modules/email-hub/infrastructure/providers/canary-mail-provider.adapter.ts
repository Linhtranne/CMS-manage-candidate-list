import { assertCanaryRecipients } from '../../domain/email.rules.js';
import type { MailCursor, ProviderChangePage, ProviderHealth, ProviderMessage, ProviderSendInput, ProviderSendResult, ProviderSendLookup, MailboxProvider } from '../../domain/email.types.js';
import type { Readable } from 'node:stream';
import { MailProviderError, type MailProviderAdapter } from './mail-provider.port.js';

/** Defense-in-depth guard for staging: no provider call may escape the canary list. */
export class CanaryMailProviderAdapter implements MailProviderAdapter {
  constructor(
    private readonly delegate: MailProviderAdapter,
    private readonly canaryOnly: boolean,
    private readonly canaryRecipients: readonly string[],
  ) {}

  get provider(): MailboxProvider { return this.delegate.provider; }
  validateConnection(): Promise<ProviderHealth> { return this.delegate.validateConnection(); }
  async send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> {
    assertCanaryRecipients([
      ...input.to.map((address) => ({ address })),
      ...(input.cc ?? []).map((address) => ({ address })),
      ...(input.bcc ?? []).map((address) => ({ address })),
    ], this.canaryOnly, this.canaryRecipients);
    return this.delegate.send(input, idempotencyKey);
  }
  findByClientReference(clientReference: string): Promise<ProviderSendLookup | null> { return this.delegate.findByClientReference?.(clientReference) ?? Promise.resolve(null); }
  fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> { return this.delegate.fetchChanges(cursor, limit); }
  fetchMessage(providerMessageId: string): Promise<ProviderMessage> { return this.delegate.fetchMessage(providerMessageId); }
  fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable> { return this.delegate.fetchAttachment(providerMessageId, attachmentId); }
  renewSubscription(subscriptionId: string): Promise<{ subscriptionId: string; expiresAt: Date }> {
    if (!this.delegate.renewSubscription) return Promise.reject(new MailProviderError('MAIL_PROVIDER_SUBSCRIPTION_UNSUPPORTED'));
    return this.delegate.renewSubscription(subscriptionId);
  }
}
