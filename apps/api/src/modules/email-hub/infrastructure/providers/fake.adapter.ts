import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { MailProviderAdapter } from './mail-provider.port.js';
import type { MailCursor, ProviderChangePage, ProviderHealth, ProviderMessage, ProviderSendInput, ProviderSendResult } from '../../domain/email.types.js';

type StoredFakeMessage = ProviderMessage & { input: ProviderSendInput; internetMessageId: string };

export class FakeMailProviderAdapter implements MailProviderAdapter {
  readonly provider = 'FAKE' as const;
  private readonly sentByKey = new Map<string, ProviderSendResult>();
  private readonly messages = new Map<string, StoredFakeMessage>();
  private sequence = 0;

  async validateConnection(): Promise<ProviderHealth> {
    return { provider: this.provider, status: 'healthy', checkedAt: new Date() };
  }

  async send(input: ProviderSendInput, idempotencyKey: string): Promise<ProviderSendResult> {
    const replay = this.sentByKey.get(idempotencyKey);
    if (replay) return replay;
    const digest = createHash('sha256').update(`${idempotencyKey}:${input.to.join(',')}:${input.subject}`).digest('hex').slice(0, 24);
    const providerMessageId = `fake-${digest}`;
    const acceptedAt = new Date();
    const result = { providerMessageId, internetMessageId: `<${providerMessageId}@fake.invalid>`, acceptedAt };
    this.sentByKey.set(idempotencyKey, result);
    this.messages.set(providerMessageId, {
      providerMessageId,
      internetMessageId: result.internetMessageId,
      from: input.from,
      to: input.to,
      subject: input.subject,
      bodyText: input.bodyText,
      receivedAt: acceptedAt,
      input,
    });
    return result;
  }

  async fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage> {
    const start = cursor ? Number(cursor.value) : 0;
    const entries = [...this.messages.values()].slice(start, start + Math.max(0, limit));
    const next = start + entries.length;
    return {
      changes: entries.map((message) => ({ providerMessageId: message.providerMessageId, receivedAt: message.receivedAt })),
      nextCursor: next < this.messages.size ? { value: String(next), issuedAt: new Date() } : null,
    };
  }

  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> {
    const message = this.messages.get(providerMessageId);
    if (!message) throw new Error('FAKE_MESSAGE_NOT_FOUND');
    return { providerMessageId: message.providerMessageId, from: message.from, to: message.to, subject: message.subject, bodyText: message.bodyText, receivedAt: message.receivedAt };
  }

  async fetchAttachment(_providerMessageId: string, attachmentId: string): Promise<Readable> {
    return Readable.from([Buffer.from(`fake-attachment:${attachmentId}`)]);
  }

  async renewSubscription(subscriptionId: string): Promise<{ subscriptionId: string; expiresAt: Date }> {
    this.sequence += 1;
    return { subscriptionId: `${subscriptionId}:${this.sequence}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000) };
  }
}
