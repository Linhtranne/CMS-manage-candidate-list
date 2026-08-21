import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { MailWebhookService } from '../application/mail-webhook.service.js';
import { MAILBOX_PROVIDERS, type MailboxProvider } from '../domain/email.types.js';

@Controller('webhooks/mail')
export class MailWebhookController {
  constructor(private readonly webhook: MailWebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Param('provider') providerParam: string,
    @Headers('x-mail-signature') signature: string | undefined,
    @Body() body: { mailboxId?: string; notificationId?: string; providerMessageId?: string },
  ) {
    const provider = providerParam.toUpperCase() as MailboxProvider;
    if (!MAILBOX_PROVIDERS.includes(provider) || provider === 'DISABLED') throw Object.assign(new Error('MAIL_PROVIDER_DISABLED'), { code: 'MAIL_PROVIDER_DISABLED', statusCode: 503, messageKey: 'errors.mailProviderDisabled' });
    if (!signature || !body.mailboxId || !body.notificationId || !body.providerMessageId) throw Object.assign(new Error('MAIL_WEBHOOK_INVALID'), { code: 'MAIL_WEBHOOK_INVALID', statusCode: 401, messageKey: 'errors.mailWebhookInvalid' });
    return this.webhook.handle({ provider, mailboxId: body.mailboxId, notificationId: body.notificationId, providerMessageId: body.providerMessageId, signature });
  }
}
