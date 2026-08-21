import { Module } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../platform/config/config.module.js';
import { CandidateService } from './application/candidate.service.js';
import { CandidatesController } from './http/candidates.controller.js';
import { CandidatePrismaRepository } from './infrastructure/candidate.prisma-repository.js';
import { CandidateImportService } from './application/import.service.js';
import { CandidateMergeService } from './application/merge.service.js';
import { CandidateImportsController } from './http/candidate-imports.controller.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule],
  controllers: [CandidatesController, CandidateImportsController],
  providers: [
    CandidatePrismaRepository,
    CandidateImportService,
    CandidateMergeService,
    {
      provide: CandidateService,
      useFactory: (repository: CandidatePrismaRepository, audit: AuditWriter, outbox: OutboxRepository, config: RuntimeConfig) => new CandidateService(repository, config.security.encryptionKey, {
        audit: async (transaction, input) => { await audit.append(transaction as Prisma.TransactionClient, { action: input.action, entityType: 'Candidate', entityId: input.entityId, actorUserId: input.actorUserId, correlationId: input.correlationId, metadataJson: input.metadata ?? {} }); },
        outbox: async (transaction, input) => { await outbox.append(transaction as Prisma.TransactionClient, { eventType: input.eventType, aggregateType: 'Candidate', aggregateId: input.aggregateId, idempotencyKey: `${input.eventType}:${input.aggregateId}`, correlationId: input.correlationId, payload: { candidateId: input.aggregateId } }); },
      }),
      inject: [CandidatePrismaRepository, AuditWriter, OutboxRepository, RUNTIME_CONFIG],
    },
  ],
  exports: [CandidateService, CandidateImportService, CandidateMergeService],
})
export class CandidatesModule {}
