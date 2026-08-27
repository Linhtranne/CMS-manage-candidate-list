import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/config.module.js';

export function redactDatabaseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, 'postgresql://[redacted]');
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(RUNTIME_CONFIG) private readonly configForBoot: RuntimeConfig) {
    const adapter = new PrismaPg({
      connectionString: configForBoot.database.url,
      max: configForBoot.database.poolMax,
      connectionTimeoutMillis: configForBoot.database.connectTimeoutMs,
      statement_timeout: configForBoot.database.statementTimeoutMs,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    if (this.configForBoot.nodeEnv === 'development' || this.configForBoot.nodeEnv === 'test') return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async assertReady(): Promise<void> {
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      const cause = new Error(redactDatabaseErrorMessage(error));
      return Promise.reject(new Error('Database readiness check failed', { cause }));
    }
  }
}
