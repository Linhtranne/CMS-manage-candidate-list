import { describe, expect, it, vi } from 'vitest';
import { MailProviderError } from '../../src/modules/email-hub/infrastructure/providers/mail-provider.port.js';
import { SesSmtpMailProviderAdapter } from '../../src/modules/email-hub/infrastructure/providers/ses-smtp.adapter.js';

describe('SES SMTP Nodemailer adapter', () => {
  it('verifies the SMTP connection without exposing credentials', async () => {
    const verify = vi.fn().mockResolvedValue(undefined);
    const provider = new SesSmtpMailProviderAdapter({
      endpoint: 'email-smtp.ap-southeast-2.amazonaws.com',
      port: 587,
      username: 'smtp-user',
      password: 'smtp-password-that-must-never-leak',
      secure: false,
    }, { verify, sendMail: vi.fn() });

    await expect(provider.validateConnection()).resolves.toMatchObject({ provider: 'SMTP_IMAP', status: 'healthy' });
    expect(verify).toHaveBeenCalledOnce();
  });

  it('sends text/html notification and returns the SES message id', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<ses-message-id@example.com>', accepted: ['candidate@example.com'] });
    const provider = new SesSmtpMailProviderAdapter({
      endpoint: 'email-smtp.ap-southeast-2.amazonaws.com',
      port: 587,
      username: 'smtp-user',
      password: 'smtp-password',
      secure: false,
    }, { verify: vi.fn(), sendMail });

    const result = await provider.send({
      from: 'noreply@linhtranne.id.vn',
      to: ['candidate@example.com'],
      cc: ['ops@example.com'],
      bcc: ['audit@example.com'],
      subject: 'Application updated',
      bodyText: 'Your application moved to interview.',
      sanitizedHtml: '<p>Your application moved to interview.</p>',
      headers: { 'X-CMS-Message-Id': 'email-123' },
    }, 'cms-email:email-123');

    expect(result.providerMessageId).toBe('<ses-message-id@example.com>');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'noreply@linhtranne.id.vn',
      to: ['candidate@example.com'],
      cc: ['ops@example.com'],
      bcc: ['audit@example.com'],
      subject: 'Application updated',
      text: 'Your application moved to interview.',
      html: '<p>Your application moved to interview.</p>',
      headers: expect.objectContaining({ 'X-CMS-Message-Id': 'email-123', 'X-CMS-Idempotency-Key': 'cms-email:email-123' }),
    }));
  });

  it('maps SMTP failures to a redacted provider error', async () => {
    const provider = new SesSmtpMailProviderAdapter({
      endpoint: 'email-smtp.ap-southeast-2.amazonaws.com',
      port: 587,
      username: 'smtp-user',
      password: 'smtp-password-must-not-appear',
      secure: false,
    }, { verify: vi.fn().mockRejectedValue(new Error('535 Authentication credentials invalid')), sendMail: vi.fn() });

    const error = await provider.validateConnection().catch((candidate) => candidate) as unknown as MailProviderError;
    expect(error).toBeInstanceOf(MailProviderError);
    expect(error.code).toBe('MAIL_PROVIDER_AUTH_FAILED');
    expect(error.message).not.toContain('smtp-password-must-not-appear');
  });

  it('fails inbound operations explicitly because DEC-003 selects outbound-only notification mail', async () => {
    const provider = new SesSmtpMailProviderAdapter({ endpoint: 'email-smtp.ap-southeast-2.amazonaws.com', port: 587, username: 'u', password: 'p', secure: false }, { verify: vi.fn(), sendMail: vi.fn() });
    await expect(provider.fetchChanges(null, 10)).rejects.toThrow('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
    await expect(provider.fetchMessage('message-id')).rejects.toThrow('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
    await expect(provider.fetchAttachment('message-id', 'attachment-id')).rejects.toThrow('MAIL_PROVIDER_OPERATION_UNSUPPORTED');
  });
});
