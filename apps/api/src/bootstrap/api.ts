import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { RUNTIME_CONFIG } from '../platform/config/config.module.js';
import type { RuntimeConfig } from '../platform/config/config.schema.js';
import { configureApiApp } from './api-config.js';

function configureUtc(): void {
  process.env.TZ = 'UTC';
}

export async function bootstrapApi(): Promise<void> {
  configureUtc();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  configureApiApp(app, config);
  await app.listen(config.http.port, config.http.host);
}

if (process.argv[1]?.endsWith('api.js')) {
  void bootstrapApi().catch((error: unknown) => {
    console.error('API bootstrap failed', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
