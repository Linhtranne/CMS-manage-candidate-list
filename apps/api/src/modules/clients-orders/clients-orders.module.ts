import { Module } from '@nestjs/common';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { ClientService } from './application/client.service.js';
import { JobOrderService } from './application/job-order.service.js';
import { ClientsController } from './http/clients.controller.js';
import { OrdersController } from './http/orders.controller.js';
import { ClientsOrdersPrismaRepository } from './infrastructure/clients-orders.prisma-repository.js';

function effects(audit: AuditWriter, outbox: OutboxRepository) {
  return {
    audit: async (transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }) => {
      await audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'ClientOrJobOrder', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId });
    },
    outbox: async (transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }) => {
      await outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'ClientOrJobOrder', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}:${input.correlationId}`, correlationId: input.correlationId, payload: { aggregateId: input.aggregateId } });
    },
  };
}

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule],
  controllers: [ClientsController, OrdersController],
  providers: [
    ClientsOrdersPrismaRepository,
    { provide: ClientService, useFactory: (repository: ClientsOrdersPrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new ClientService(repository, effects(audit, outbox)), inject: [ClientsOrdersPrismaRepository, AuditWriter, OutboxRepository] },
    { provide: JobOrderService, useFactory: (repository: ClientsOrdersPrismaRepository, audit: AuditWriter, outbox: OutboxRepository) => new JobOrderService(repository, effects(audit, outbox)), inject: [ClientsOrdersPrismaRepository, AuditWriter, OutboxRepository] },
  ],
  exports: [ClientService, JobOrderService],
})
export class ClientsOrdersModule {}
