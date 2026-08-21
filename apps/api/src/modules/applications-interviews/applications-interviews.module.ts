import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { AuditWriter } from '../audit/audit-writer.js';
import { OutboxRepository } from '../../platform/outbox/outbox.repository.js';
import { ApplicationService } from './application/application.service.js';
import { InterviewService } from './application/interview.service.js';
import { ApplicationsInterviewsController } from './http/applications-interviews.controller.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule],
  controllers: [ApplicationsInterviewsController],
  providers: [ApplicationService, InterviewService, AuditWriter, OutboxRepository],
  exports: [ApplicationService, InterviewService],
})
export class ApplicationsInterviewsModule {}
