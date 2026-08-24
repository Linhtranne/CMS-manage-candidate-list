import { Module } from '@nestjs/common';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { CatalogApprovalGate } from '../catalog/application/catalog-approval.gate.js';
import { JourneyTemplateService } from './application/journey-template.service.js';
import { JourneyTemplateController } from './http/journey-template.controller.js';
import { SupplyJourneyController } from './http/supply-journey.controller.js';
import { JourneyMilestonesController } from './http/journey-milestones.controller.js';
import { JourneyTemplatePrismaRepository } from './infrastructure/journey-template.prisma-repository.js';
import { SupplyJourneyPrismaRepository } from './infrastructure/supply-journey.prisma-repository.js';
import { JourneyMilestonePrismaRepository } from './infrastructure/journey-milestone.prisma-repository.js';
import { SupplyJourneyService } from './application/supply-journey.service.js';
import { JourneyMilestoneService } from './application/journey-milestone.service.js';
import { JourneyCompletionService } from './application/journey-completion.service.js';
import { JourneyLifecycleController } from './http/journey-lifecycle.controller.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../platform/config/config.module.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { Prisma } from '../../generated/prisma/client.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule],
  controllers: [JourneyTemplateController, SupplyJourneyController, JourneyMilestonesController, JourneyLifecycleController],
  providers: [
    CatalogApprovalGate,
    JourneyTemplatePrismaRepository,
    SupplyJourneyPrismaRepository,
    JourneyMilestonePrismaRepository,
    {
      provide: JourneyTemplateService,
      useFactory: (repository: JourneyTemplatePrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new JourneyTemplateService(repository, {
        audit: async (transaction, input) => audit.append(transaction as Prisma.TransactionClient, {
          action: input.action,
          entityType: 'SupplyJourneyTemplateVersion',
          entityId: input.entityId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
        }).then(() => undefined),
        outbox: async (transaction, input) => outbox.append(transaction as Prisma.TransactionClient, {
          eventType: input.eventType,
          aggregateType: 'SupplyJourneyTemplateVersion',
          aggregateId: input.aggregateId,
          idempotencyKey: `${input.eventType}:${input.aggregateId}`,
          correlationId: input.correlationId,
          payload: { templateVersionId: input.aggregateId },
        }).then(() => undefined),
      }),
      inject: [JourneyTemplatePrismaRepository, AuditWriter, OutboxRepository],
    },
    {
      provide: SupplyJourneyService,
      useFactory: (repository: SupplyJourneyPrismaRepository, templates: JourneyTemplateService, config: RuntimeConfig, audit: AuditWriter, outbox: OutboxRepository) => new SupplyJourneyService(repository, templates, config.security.encryptionKey, {
        audit: async (transaction, input) => audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'SupplyJourney', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId, metadataJson: input.metadata }).then(() => undefined),
        outbox: async (transaction, input) => outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'SupplyJourney', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}`, correlationId: input.correlationId, payload: input.payload }).then(() => undefined),
      }),
      inject: [SupplyJourneyPrismaRepository, JourneyTemplateService, RUNTIME_CONFIG, AuditWriter, OutboxRepository],
    },
    {
      provide: JourneyMilestoneService,
      useFactory: (repository: JourneyMilestonePrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new JourneyMilestoneService(repository, undefined, {
        audit: async (transaction, input) => audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'JourneyMilestone', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId, metadataJson: input.metadata }).then(() => undefined),
        outbox: async (transaction, input) => outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'JourneyMilestone', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}:${input.payload.toStatus ?? 'event'}`, correlationId: input.correlationId, payload: input.payload }).then(() => undefined),
      }),
      inject: [JourneyMilestonePrismaRepository, AuditWriter, OutboxRepository],
    },
    {
      provide: JourneyCompletionService,
      useFactory: (repository: SupplyJourneyPrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new JourneyCompletionService(repository, {}, {
        audit: async (transaction, input) => audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'SupplyJourney', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId, metadataJson: input.metadata }).then(() => undefined),
        outbox: async (transaction, input) => outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'SupplyJourney', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}`, correlationId: input.correlationId, payload: input.payload }).then(() => undefined),
      }),
      inject: [SupplyJourneyPrismaRepository, AuditWriter, OutboxRepository],
    },
  ],
  exports: [JourneyTemplateService],
})
export class SupplyJourneysModule {}
