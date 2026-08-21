import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { PolicyService } from './application/policy.service.js';
import { SessionService } from './application/session.service.js';
import { AuthController } from './http/auth.controller.js';
import { PolicyController } from './http/policy.controller.js';
import { CsrfGuard } from './http/guards/csrf.guard.js';
import { PolicyGuard } from './http/guards/policy.guard.js';
import { SessionGuard } from './http/guards/session.guard.js';
import { OIDC_FETCH, OidcAdapter } from './infrastructure/oidc.adapter.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule],
  controllers: [AuthController, PolicyController],
  providers: [
    PolicyService,
    SessionService,
    OidcAdapter,
    SessionGuard,
    CsrfGuard,
    PolicyGuard,
    { provide: OIDC_FETCH, useValue: (...args: Parameters<typeof fetch>) => fetch(...args) },
  ],
  exports: [PolicyService, SessionService, OidcAdapter, SessionGuard, CsrfGuard, PolicyGuard],
})
export class IdentityAccessModule {}
