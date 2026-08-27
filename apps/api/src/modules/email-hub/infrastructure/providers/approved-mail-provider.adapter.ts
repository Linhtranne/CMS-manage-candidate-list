import type { Readable } from 'node:stream';
import { MailProviderError, type MailProviderAdapter } from './mail-provider.port.js';
import type { MailCursor, ProviderChangePage, ProviderHealth, ProviderMessage, ProviderSendInput, ProviderSendResult, MailboxProvider } from '../../domain/email.types.js';

/**
 * Boundary used once DEC-003 selects a real provider. Approval is evaluated on
 * every operation so revocation immediately fails closed without restarting the worker.
 */
export class ApprovedMailProviderAdapter implements MailProviderAdapter {
  constructor(private readonly delegate: MailProviderAdapter, private readonly approvalIsValid: () => boolean) {}

  get provider(): MailboxProvider { return this.delegate.provider; }

  private assertApproved(): void {
    if (!this.approvalIsValid()) throw new MailProviderError('MAIL_PROVIDER_APPROVAL_REQUIRED');
  }

  async validateConnection(): Promise<ProviderHealth> { this.assertApproved(); return this.delegate.validateConnection(); }
  async send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> { this.assertApproved(); return this.delegate.send(input, idempotencyKey); }
  async findByClientReference(clientReference: string): Promise<ProviderSendResult | null> { this.assertApproved(); return this.delegate.findByClientReference?.(clientReference) ?? null; }
  async fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> { this.assertApproved(); return this.delegate.fetchChanges(cursor, limit); }
  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> { this.assertApproved(); return this.delegate.fetchMessage(providerMessageId); }
  async fetchAttachment(providerMessageId: string, attachmentId: string): Promise<Readable> { this.assertApproved(); return this.delegate.fetchAttachment(providerMessageId, attachmentId); }
  async renewSubscription(subscriptionId: string): Promise<{ subscriptionId: string; expiresAt: Date }> { this.assertApproved(); if (!this.delegate.renewSubscription) throw new MailProviderError('MAIL_PROVIDER_SUBSCRIPTION_UNSUPPORTED'); return this.delegate.renewSubscription(subscriptionId); }
}
