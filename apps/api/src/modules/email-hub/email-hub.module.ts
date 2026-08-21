import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { DisabledMailProviderAdapter } from './infrastructure/providers/disabled.adapter.js';
import { EmailPrismaRepository } from './infrastructure/email.prisma-repository.js';
import { FakeMailProviderAdapter } from './infrastructure/providers/fake.adapter.js';

export const MAIL_PROVIDER_ADAPTER = Symbol('MAIL_PROVIDER_ADAPTER');

@Module({
  imports: [DatabaseModule],
  providers: [
    EmailPrismaRepository,
    DisabledMailProviderAdapter,
    FakeMailProviderAdapter,
    { provide: MAIL_PROVIDER_ADAPTER, useExisting: DisabledMailProviderAdapter },
  ],
  exports: [EmailPrismaRepository, MAIL_PROVIDER_ADAPTER, FakeMailProviderAdapter],
})
export class EmailHubModule {}
