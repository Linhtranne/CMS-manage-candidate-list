import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AuditQueryController } from './audit-query.controller.js';
import { AuditQueryService } from './audit-query.service.js';
@Module({ imports: [DatabaseModule, IdentityAccessModule], controllers: [AuditQueryController], providers: [AuditQueryService], exports: [AuditQueryService] })
export class AuditModule {}
