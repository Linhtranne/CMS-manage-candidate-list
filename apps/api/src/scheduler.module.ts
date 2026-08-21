import { Module } from '@nestjs/common';
import { RuntimeConfigModule } from './platform/config/config.module.js';
import { CommandPlatformModule } from './platform/command-platform.module.js';
import { SchedulerRuntimeService } from './platform/outbox/scheduler-runtime.service.js';
import { QueueModule } from './platform/queue/queue.module.js';
import { TelemetryModule } from './platform/telemetry/telemetry.module.js';

@Module({
  imports: [RuntimeConfigModule.forRoot(), QueueModule, TelemetryModule, CommandPlatformModule],
  providers: [SchedulerRuntimeService],
})
export class SchedulerModule {}
