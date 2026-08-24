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
import { bindMailProvider } from './infrastructure/providers/mail-provider.factory.js';
import { MAIL_PROVIDER_OPERATION_LIMITER, NoopMailOperationLimiter, RedisMailOperationLimiter, type MailOperationLimiter } from './infrastructure/providers/mail-provider-rate-limiter.js';
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
import { RenewMailSubscriptionProcessor } from './workers/renew-mail-subscription.processor.js';
import { MailSubscriptionSchedulerService } from './workers/mail-subscription-scheduler.service.js';
import { FILE_SCANNER, DisabledFileScanAdapter, type FileScanPort } from '../../platform/files/file-scan.port.js';
import { FILE_SCANNER_CLIENT, createFileScanner, type FileScannerClient } from '../../platform/files/file-scan.factory.js';
import { OBJECT_STORAGE, DisabledObjectStorageAdapter, type ObjectStoragePort } from '../../platform/storage/object-storage.port.js';
import { OBJECT_STORAGE_CLIENT, createObjectStorageAdapter } from '../../platform/storage/object-storage.factory.js';
import type { S3CompatibleClient } from '../../platform/storage/s3-object-storage.adapter.js';

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
      useFactory: (config: RuntimeConfig, repository: EmailPrismaRepository, queue: QueueService) => new MailWebhookService(config.security.sessionSecret, repository, queue, undefined, () => config.mail.enabled),
    },
    EmailInboundService,
    MailSyncProcessor,
    FetchMessageProcessor,
    ScanAttachmentProcessor,
    RenewMailSubscriptionProcessor,
    MailSubscriptionSchedulerService,
    DisabledFileScanAdapter,
    DisabledObjectStorageAdapter,
    { provide: FILE_SCANNER_CLIENT, useValue: undefined },
    { provide: OBJECT_STORAGE_CLIENT, useValue: undefined },
    {
      provide: MAIL_PROVIDER_OPERATION_LIMITER,
      inject: [RUNTIME_CONFIG],
      useFactory: (config: RuntimeConfig) => config.mail.provider === 'DISABLED' || config.mail.provider === 'FAKE'
        ? new NoopMailOperationLimiter()
        : new RedisMailOperationLimiter(config.redis.url, config.mail.operationalPolicy!),
    },
    {
      provide: MAIL_PROVIDER_ADAPTER,
      inject: [RUNTIME_CONFIG, DisabledMailProviderAdapter, FakeMailProviderAdapter, MAIL_PROVIDER_OPERATION_LIMITER],
      useFactory: (config: RuntimeConfig, disabled: DisabledMailProviderAdapter, fake: FakeMailProviderAdapter, limiter: MailOperationLimiter) =>
        bindMailProvider(config, disabled, limiter, config.mail.provider === 'FAKE' ? fake : undefined),
    },
    {
      provide: FILE_SCANNER,
      inject: [RUNTIME_CONFIG, DisabledFileScanAdapter, FILE_SCANNER_CLIENT],
      useFactory: (config: RuntimeConfig, disabled: DisabledFileScanAdapter, client: FileScannerClient | undefined): FileScanPort => createFileScanner(config, disabled, client),
    },
    {
      provide: OBJECT_STORAGE,
      inject: [RUNTIME_CONFIG, DisabledObjectStorageAdapter, OBJECT_STORAGE_CLIENT],
      useFactory: (config: RuntimeConfig, disabled: DisabledObjectStorageAdapter, client: S3CompatibleClient | undefined): ObjectStoragePort => createObjectStorageAdapter(config, disabled, client),
    },
    {
      provide: QUEUE_HANDLERS,
      inject: [SendEmailProcessor, ReconcileSendProcessor, FetchMessageProcessor, MailSyncProcessor, ScanAttachmentProcessor, RenewMailSubscriptionProcessor, RUNTIME_CONFIG],
      useFactory: (processor: SendEmailProcessor, reconciler: ReconcileSendProcessor, fetcher: FetchMessageProcessor, sync: MailSyncProcessor, scanner: ScanAttachmentProcessor, renewSubscription: RenewMailSubscriptionProcessor, config: RuntimeConfig): QueueHandlerRegistration[] => [
        { name: 'outbox', handler: (payload: QueuePayload) => processor.handleOutbox(payload) },
        ...(config.queue.names.includes('reconcile') ? [{ name: 'reconcile', handler: (payload: QueuePayload) => reconciler.handle(payload) }] : []),
        ...(config.queue.names.includes('mail-ingest') ? [{ name: 'mail-ingest', handler: (payload: QueuePayload) => fetcher.handle(payload) }] : []),
        ...(config.queue.names.includes('mail-sync') ? [{ name: 'mail-sync', handler: (payload: QueuePayload) => sync.handle(payload) }] : []),
        ...(config.queue.names.includes('mail-subscription') ? [{ name: 'mail-subscription', handler: (payload: QueuePayload) => renewSubscription.handle(payload) }] : []),
        ...(config.queue.names.includes('file-scan') ? [{ name: 'file-scan', handler: (payload: QueuePayload) => scanner.handle(payload) }] : []),
      ],
    },
  ],
  exports: [EmailPrismaRepository, MAIL_PROVIDER_ADAPTER, MAIL_PROVIDER_OPERATION_LIMITER, FakeMailProviderAdapter, EmailPreviewService, EmailCommandService, SendEmailProcessor, ReconcileSendProcessor, RenewMailSubscriptionProcessor, MailSubscriptionSchedulerService, EmailMatcherService, EmailInboundService, QUEUE_HANDLERS],
})
export class EmailHubModule {}

export { MAIL_PROVIDER_ADAPTER } from './infrastructure/providers/mail-provider.port.js';
