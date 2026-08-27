import { Module } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { TaskService } from './application/task.service.js';
import { TaskRuleConsumer } from './application/task-rule.consumer.js';
import { TasksController, WorkItemsController } from './http/tasks.controller.js';
import { NotesController } from './http/notes.controller.js';
import { TaskPrismaRepository } from './infrastructure/task.prisma-repository.js';
import { ReportProjectionRepository } from './infrastructure/report-projection.repository.js';
import { ReportQueryService } from './application/report-query.service.js';
import { ReportProjectionProcessor } from './workers/report-projection.processor.js';
import { ReportsController } from './http/reports.controller.js';
import { ReportExportsController } from './http/report-exports.controller.js';
import { ReportExportService } from './application/report-export.service.js';
import { ReportExportPrismaRepository } from './infrastructure/report-export.prisma-repository.js';
import { RUNTIME_CONFIG, RuntimeConfigModule, type RuntimeConfig } from '../../platform/config/config.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { NotificationService } from '../notifications/application/notification.service.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule, RuntimeConfigModule.forRoot(), NotificationsModule],
  controllers: [TasksController, WorkItemsController, NotesController, ReportsController, ReportExportsController],
  providers: [
    TaskPrismaRepository,
    TaskRuleConsumer,
    ReportProjectionRepository,
    ReportExportPrismaRepository,
    ReportProjectionProcessor,
    { provide: ReportQueryService, useFactory: (repository: ReportProjectionRepository) => new ReportQueryService(repository), inject: [ReportProjectionRepository] },
    {
      provide: ReportExportService,
      useFactory: (repository: ReportExportPrismaRepository, config: RuntimeConfig) => new ReportExportService(repository, config.activation.exports.enabled),
      inject: [ReportExportPrismaRepository, RUNTIME_CONFIG],
    },
    {
      provide: TaskService,
      useFactory: (repository: TaskPrismaRepository, audit: AuditWriter, outbox: OutboxRepository, notifications: NotificationService) => new TaskService(repository, {
        audit: async (transaction, input) => audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'Task', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId, metadataJson: input.metadata }).then(() => undefined),
        outbox: async (transaction, input) => outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'Task', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}:${input.correlationId}`, correlationId: input.correlationId, payload: input.payload }).then(() => undefined),
        notification: async (transaction, input) => notifications.create(input, transaction as Prisma.TransactionClient).then(() => undefined),
      }),
      inject: [TaskPrismaRepository, AuditWriter, OutboxRepository, NotificationService],
    },
  ],
  exports: [TaskService, TaskRuleConsumer],
})
export class TasksReportingModule {}
