import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RuntimeConfigModule } from './platform/config/config.module.js';
import { EnvelopeInterceptor } from './platform/http/envelope.interceptor.js';
import { ProblemFilter } from './platform/http/problem.filter.js';
import { RequestContextMiddleware } from './platform/http/request-context.middleware.js';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module.js';
import { CommandPlatformModule } from './platform/command-platform.module.js';
import { QueueModule } from './platform/queue/queue.module.js';
import { TelemetryModule } from './platform/telemetry/telemetry.module.js';
import { HealthController } from './platform/health/health.controller.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { ClientsOrdersModule } from './modules/clients-orders/clients-orders.module.js';
import { CandidatesModule } from './modules/candidates/candidates.module.js';
import { ApplicationsInterviewsModule } from './modules/applications-interviews/applications-interviews.module.js';
import { EmailHubModule } from './modules/email-hub/email-hub.module.js';
import { SupplyJourneysModule } from './modules/supply-journeys/supply-journeys.module.js';
import { TasksReportingModule } from './modules/tasks-reporting/tasks-reporting.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RetentionModule } from './modules/retention/retention.module.js';

@Module({
  imports: [RuntimeConfigModule.forRoot(), QueueModule, TelemetryModule, CommandPlatformModule, IdentityAccessModule, CatalogModule, ClientsOrdersModule, CandidatesModule, ApplicationsInterviewsModule, EmailHubModule, SupplyJourneysModule, TasksReportingModule, DocumentsModule, AuditModule, RetentionModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ProblemFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
