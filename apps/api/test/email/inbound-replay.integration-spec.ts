import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { EmailMatcherService } from '../../src/modules/email-hub/application/email-matcher.service.js';
import { MailWebhookService } from '../../src/modules/email-hub/application/mail-webhook.service.js';

describe('email inbound replay and matching', () => {
  it('matches a verified reply token before weaker correlation signals', () => {
    const matcher = new EmailMatcherService('reply-token-secret');
    const replyToken = matcher.createReplyToken({ conversationId: 'conversation-token', candidateId: 'candidate-1' });
    const result = matcher.match({
      replyToken,
      sender: 'candidate@example.test',
      inReplyTo: '<outbound@example.test>',
      candidates: [{ conversationId: 'conversation-header', candidateId: 'candidate-1', internetMessageIds: ['<outbound@example.test>'], sender: 'candidate@example.test' }],
    });
    expect(result).toMatchObject({ state: 'MATCHED', conversationId: 'conversation-token', candidateId: 'candidate-1', reason: 'VERIFIED_REPLY_TOKEN' });
  });

  it('returns ambiguous instead of guessing when sender has multiple active conversations', () => {
    const matcher = new EmailMatcherService('reply-token-secret');
    const result = matcher.match({
      sender: 'candidate@example.test',
      candidates: [
        { conversationId: 'conversation-1', candidateId: 'candidate-1', sender: 'candidate@example.test' },
        { conversationId: 'conversation-2', candidateId: 'candidate-1', sender: 'candidate@example.test' },
      ],
    });
    expect(result).toMatchObject({ state: 'AMBIGUOUS', reason: 'SENDER_MULTIPLE_ACTIVE_CONVERSATIONS' });
  });

  it('verifies and deduplicates webhook notifications before enqueueing fetch', async () => {
    const secret = 'webhook-secret';
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ provider: 'MICROSOFT_GRAPH' }),
      claimWebhookNotification: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    };
    const queue = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const webhook = new MailWebhookService(secret, repository as never, queue as never);
    const input = { provider: 'MICROSOFT_GRAPH' as const, mailboxId: 'mailbox-1', notificationId: 'notification-1', providerMessageId: 'provider-message-1' };
    const signature = createHmac('sha256', secret).update(webhook.signingValue(input)).digest('hex');
    await expect(webhook.handle({ ...input, signature })).resolves.toMatchObject({ duplicate: false });
    await expect(webhook.handle({ ...input, signature })).resolves.toMatchObject({ duplicate: true });
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(queue.enqueue.mock.calls[0])).not.toContain('candidate@example.test');
  });

  it('rejects a signed notification when the provider is not bound to the mailbox', async () => {
    const secret = 'webhook-secret';
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ provider: 'GMAIL_API' }),
      claimWebhookNotification: vi.fn(),
    };
    const queue = { enqueue: vi.fn() };
    const webhook = new MailWebhookService(secret, repository as never, queue as never);
    const input = { provider: 'MICROSOFT_GRAPH' as const, mailboxId: 'mailbox-1', notificationId: 'notification-2', providerMessageId: 'provider-message-2' };
    const signature = createHmac('sha256', secret).update(webhook.signingValue(input)).digest('hex');
    await expect(webhook.handle({ ...input, signature })).rejects.toMatchObject({ code: 'MAIL_WEBHOOK_INVALID', statusCode: 401 });
    expect(repository.claimWebhookNotification).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('fails closed when runtime mail delivery is disabled even if the queue is available', async () => {
    const secret = 'webhook-secret';
    const repository = {
      findMailbox: vi.fn().mockResolvedValue({ provider: 'MICROSOFT_GRAPH' }),
      claimWebhookNotification: vi.fn(),
    };
    const queue = { enabled: true, enqueue: vi.fn() };
    const webhook = new MailWebhookService(secret, repository as never, queue as never, undefined, () => false);
    const input = { provider: 'MICROSOFT_GRAPH' as const, mailboxId: 'mailbox-1', notificationId: 'notification-3', providerMessageId: 'provider-message-3' };
    const signature = createHmac('sha256', secret).update(webhook.signingValue(input)).digest('hex');
    await expect(webhook.handle({ ...input, signature })).rejects.toMatchObject({ code: 'MAIL_PROVIDER_DISABLED', statusCode: 503 });
    expect(repository.findMailbox).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
