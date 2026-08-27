import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';

@Controller()
export class HealthController {
  private readonly startedAt = new Date().toISOString();
  private readonly service = 'cms-candidate-supply-api';
  private readonly version = process.env.APP_VERSION ?? 'dev';

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly telemetry: TelemetryService,
  ) {}

  @Get('health/live')
  live() { return { status: 'ok' as const, service: this.service, version: this.version }; }

  @Get('health/startup')
  startup() { return { status: 'ok' as const, service: this.service, version: this.version, startedAt: this.startedAt }; }

  @Get('health/ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const checks: Record<string, string> = { database: 'ok', queue: 'ok' };
    try { await this.prisma.assertReady(); } catch { checks.database = 'failed'; }
    try { await this.queue.assertReady(); } catch { checks.queue = 'failed'; }
    const ready = Object.values(checks).every((value) => value === 'ok');
    if (!ready) response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ready ? 'ok' : 'degraded', service: this.service, version: this.version, checks };
  }

  @Get('metrics')
  metrics() { return this.telemetry.snapshot(); }
}
