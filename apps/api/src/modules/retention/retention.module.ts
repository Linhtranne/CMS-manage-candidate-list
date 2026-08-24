import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { RetentionService } from './application/retention.service.js';
import { RetentionController } from './http/retention.controller.js';
import { RetentionPrismaRepository } from './infrastructure/retention.prisma-repository.js';
import { RUNTIME_CONFIG, RuntimeConfigModule, type RuntimeConfig } from '../../platform/config/config.module.js';
@Module({ imports: [DatabaseModule, IdentityAccessModule, RuntimeConfigModule.forRoot()], controllers: [RetentionController], providers: [RetentionPrismaRepository, { provide: RetentionService, useFactory: (repository: RetentionPrismaRepository, config: RuntimeConfig) => new RetentionService(repository, config.activation.retention.purgeEnabled), inject: [RetentionPrismaRepository, RUNTIME_CONFIG] }], exports: [RetentionService] })
export class RetentionModule {}
