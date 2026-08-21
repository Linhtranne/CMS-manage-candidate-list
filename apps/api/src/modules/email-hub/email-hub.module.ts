import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { RUNTIME_CONFIG, RuntimeConfigModule, type RuntimeConfig } from '../../platform/config/config.module.js';
import { QUEUE_HANDLERS, type QueueHandlerRegistration } from '../../platform/queue/worker-runtime.service.js';
import type { QueuePayload } from '../../platform/queue/queue.service.js';
import { QueueModule } from '../../platform/queue/queue.module.js';
import { QueueService } from '../../platform/queue/queue.service.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { DisabledMailProviderAdapter } from './infrastructure/providers/disabled.adapter.js';
import { EmailPrismaRepository } from './infrastructure/email.prisma-repository.js';
import { FakeMailProviderAdapter } from './infrastructure/providers/fake.adapter.js';
import { MAIL_PROVIDER_ADAPTER } from './infrastructure/providers/mail-provider.port.js';
import { EmailPreviewService } from './application/email-preview.service.js';
import { EmailCommandService } from './application/email-command.service.js';
import { EmailQueryService } from './application/email-query.service.js';
import { SendEmailProcessor } from './workers/send-email.processor.js';
import { ReconcileSendProcessor } from './workers/reconcile-send.processor.js';
import { EmailsController } from './http/emails.controller.js';
import { EmailMessagesController } from './http/email-messages.controller.js';
import { MailWebhookController } from './http/mail-webhook.controller.js';
import { ConversationsController } from './http/conversations.controller.js';
import { MailboxAdminController } from './http/mailbox-admin.controller.js';
import { LegacyEmailPreviewController, LegacyConversationMessagesController, LegacyInboxMatchController, LegacyEmailDraftController } from './http/legacy-email.controller.js';
import { EmailMatcherService } from './application/email-matcher.service.js';
import { MailWebhookService } from './application/mail-webhook.service.js';
import { EmailInboundService } from './application/email-inbound.service.js';
import { MailSyncProcessor } from './workers/mail-sync.processor.js';
import { FetchMessageProcessor } from './workers/fetch-message.processor.js';
import { ScanAttachmentProcessor } from './workers/scan-attachment.processor.js';
import { FILE_SCANNER, DisabledFileScanAdapter } from '../../platform/files/file-scan.port.js';
import { OBJECT_STORAGE, DisabledObjectStorageAdapter } from '../../platform/storage/object-storage.port.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, QueueModule, RuntimeConfigModule.forRoot(), IdentityAccessModule],
  controllers: [EmailsController, EmailMessagesController, MailWebhookController, ConversationsController, MailboxAdminController, LegacyEmailPreviewController, LegacyConversationMessagesController, LegacyInboxMatchController, LegacyEmailDraftController],
  providers: [
    EmailPrismaRepository,
    DisabledMailProviderAdapter,
    FakeMailProviderAdapter,
    {
      provide: EmailPreviewService,
      inject: [RUNTIME_CONFIG],
      useFactory: (config: RuntimeConfig) => new EmailPreviewService(config.security.sessionSecret),
    },
    EmailCommandService,
    EmailQueryService,
    SendEmailProcessor,
    ReconcileSendProcessor,
    {
      provide: EmailMatcherService,
      inject: [RUNTIME_CONFIG],
      useFactory: (config: RuntimeConfig) => new EmailMatcherService(config.security.sessionSecret),
    },
    {
      provide: MailWebhookService,
      inject: [RUNTIME_CONFIG, EmailPrismaRepository, QueueService],
      useFactory: (config: RuntimeConfig, repository: EmailPrismaRepository, queue: QueueService) => new MailWebhookService(config.security.sessionSecret, repository, queue),
    },
    EmailInboundService,
    MailSyncProcessor,
    FetchMessageProcessor,
    ScanAttachmentProcessor,
    DisabledFileScanAdapter,
    DisabledObjectStorageAdapter,
    { provide: MAIL_PROVIDER_ADAPTER, useExisting: DisabledMailProviderAdapter },
    { provide: FILE_SCANNER, useExisting: DisabledFileScanAdapter },
    { provide: OBJECT_STORAGE, useExisting: DisabledObjectStorageAdapter },
    {
      provide: QUEUE_HANDLERS,
      inject: [SendEmailProcessor, ReconcileSendProcessor, FetchMessageProcessor, MailSyncProcessor, ScanAttachmentProcessor, RUNTIME_CONFIG],
      useFactory: (processor: SendEmailProcessor, reconciler: ReconcileSendProcessor, fetcher: FetchMessageProcessor, sync: MailSyncProcessor, scanner: ScanAttachmentProcessor, config: RuntimeConfig): QueueHandlerRegistration[] => [
        { name: 'outbox', handler: (payload: QueuePayload) => processor.handleOutbox(payload) },
        ...(config.queue.names.includes('reconcile') ? [{ name: 'reconcile', handler: (payload: QueuePayload) => reconciler.handle(payload) }] : []),
        ...(config.queue.names.includes('mail-ingest') ? [{ name: 'mail-ingest', handler: (payload: QueuePayload) => fetcher.handle(payload) }] : []),
        ...(config.queue.names.includes('mail-sync') ? [{ name: 'mail-sync', handler: (payload: QueuePayload) => sync.handle(payload) }] : []),
        ...(config.queue.names.includes('file-scan') ? [{ name: 'file-scan', handler: (payload: QueuePayload) => scanner.handle(payload) }] : []),
      ],
    },
  ],
  exports: [EmailPrismaRepository, MAIL_PROVIDER_ADAPTER, FakeMailProviderAdapter, EmailPreviewService, EmailCommandService, SendEmailProcessor, ReconcileSendProcessor, EmailMatcherService, EmailInboundService, QUEUE_HANDLERS],
})
export class EmailHubModule {}

export { MAIL_PROVIDER_ADAPTER } from './infrastructure/providers/mail-provider.port.js';
