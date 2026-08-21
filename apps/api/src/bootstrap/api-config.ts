import helmet from 'helmet';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { RuntimeConfig } from '../platform/config/config.schema.js';

export function configureApiApp(app: INestApplication, config: RuntimeConfig): void {
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.http.corsOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
}
