import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from '../worker.module.js';

function configureUtc(): void {
  process.env.TZ = 'UTC';
}

export async function bootstrapWorker(): Promise<void> {
  configureUtc();
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.enableShutdownHooks();
}

if (process.argv[1]?.endsWith('worker.js')) {
  void bootstrapWorker().catch((error: unknown) => {
    console.error('Worker bootstrap failed', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
