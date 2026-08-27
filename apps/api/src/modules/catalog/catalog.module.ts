import { Module } from '@nestjs/common';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { CatalogService } from './application/catalog.service.js';
import { CatalogController } from './http/catalog.controller.js';
import { CatalogCompatibilityController } from './http/catalog-compatibility.controller.js';
import { CatalogPrismaRepository } from './infrastructure/catalog.prisma-repository.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CatalogApprovalGate } from './application/catalog-approval.gate.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule],
  controllers: [CatalogController, CatalogCompatibilityController],
  providers: [
    CatalogApprovalGate,
    CatalogPrismaRepository,
    {
      provide: CatalogService,
      useFactory: (repository: CatalogPrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new CatalogService(repository, {
        audit: async (transaction, input) => {
          await audit.append(transaction as Prisma.TransactionClient, {
            action: input.action,
            entityType: 'CatalogVersion',
            entityId: input.entityId,
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
          });
        },
        outbox: async (transaction, input) => {
          await outbox.append(transaction as Prisma.TransactionClient, {
            eventType: input.eventType,
            aggregateType: 'CatalogVersion',
            aggregateId: input.aggregateId,
            idempotencyKey: `${input.eventType}:${input.aggregateId}:${input.correlationId}`,
            correlationId: input.correlationId,
            payload: { catalogVersionId: input.aggregateId },
          });
        },
      }),
      inject: [CatalogPrismaRepository, AuditWriter, OutboxRepository],
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
