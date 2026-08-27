import { Module } from '@nestjs/common';
import { RuntimeConfigModule } from './platform/config/config.module.js';
import { QueueModule } from './platform/queue/queue.module.js';
import { TelemetryModule } from './platform/telemetry/telemetry.module.js';
import { CommandPlatformModule } from './platform/command-platform.module.js';
import { WorkerRuntimeService } from './platform/queue/worker-runtime.service.js';
import { EmailHubModule } from './modules/email-hub/email-hub.module.js';

@Module({
  imports: [RuntimeConfigModule.forRoot(), QueueModule, TelemetryModule, CommandPlatformModule, EmailHubModule],
  providers: [WorkerRuntimeService],
})
export class WorkerModule {}
