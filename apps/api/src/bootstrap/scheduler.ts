import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SchedulerModule } from '../scheduler.module.js';

function configureUtc(): void {
  process.env.TZ = 'UTC';
}

export async function bootstrapScheduler(): Promise<void> {
  configureUtc();
  const app = await NestFactory.createApplicationContext(SchedulerModule, { bufferLogs: true });
  app.enableShutdownHooks();
}

if (process.argv[1]?.endsWith('scheduler.js')) {
  void bootstrapScheduler().catch((error: unknown) => {
    console.error('Scheduler bootstrap failed', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
