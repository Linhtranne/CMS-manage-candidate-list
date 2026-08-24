import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { MailWebhookService } from '../application/mail-webhook.service.js';
import { EXTERNAL_MAILBOX_PROVIDERS, type ExternalMailboxProvider } from '../domain/email.types.js';

class MailWebhookDto {
  @IsUUID()
  mailboxId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  notificationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  providerMessageId!: string;
}

@Controller('webhooks/mail')
export class MailWebhookController {
  constructor(private readonly webhook: MailWebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Param('provider') providerParam: string,
    @Headers('x-mail-signature') signature: string | undefined,
    @Body() body: MailWebhookDto,
  ) {
    const provider = providerParam.toUpperCase() as ExternalMailboxProvider;
    if (!(EXTERNAL_MAILBOX_PROVIDERS as readonly string[]).includes(provider)) throw Object.assign(new Error('MAIL_PROVIDER_DISABLED'), { code: 'MAIL_PROVIDER_DISABLED', statusCode: 503, messageKey: 'errors.mailProviderDisabled' });
    if (!signature) throw Object.assign(new Error('MAIL_WEBHOOK_INVALID'), { code: 'MAIL_WEBHOOK_INVALID', statusCode: 401, messageKey: 'errors.mailWebhookInvalid' });
    return this.webhook.handle({ provider, mailboxId: body.mailboxId, notificationId: body.notificationId, providerMessageId: body.providerMessageId, signature });
  }
}
