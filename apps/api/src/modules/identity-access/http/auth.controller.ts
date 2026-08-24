import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { OidcAdapter, OidcValidationError } from '../infrastructure/oidc.adapter.js';
import { CsrfViolationError, SessionAuthenticationError, SessionService } from '../application/session.service.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { readCookie, SessionGuard, type AuthenticatedRequest } from './guards/session.guard.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { Inject } from '@nestjs/common';
import { LoginDto } from './login.dto.js';

function sessionCookieOptions(config: RuntimeConfig) {
  return { httpOnly: true, secure: config.security.secureCookies, sameSite: 'lax' as const, path: '/api/v1', maxAge: 8 * 60 * 60 * 1000 };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly oidc: OidcAdapter,
    private readonly sessions: SessionService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const created = await this.sessions.authenticateWithPassword(body.email, body.password);
    response.cookie('cms_sid', created.sessionToken, sessionCookieOptions(this.config));
    response.cookie('cms_csrf', created.csrfToken, { ...sessionCookieOptions(this.config), httpOnly: false });
    return { user: created.user, expiresAt: created.expiresAt };
  }

  @Get('oidc/start')
  startOidc(@Query('returnTo') returnTo?: string) {
    return this.oidc.start(returnTo);
  }

  @Get('oidc/callback')
  async completeOidc(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    try {
      const completion = await this.oidc.complete(code, state);
      const created = await this.sessions.establishFromOidc(completion.claims);
      response.cookie('cms_sid', created.sessionToken, sessionCookieOptions(this.config));
      response.cookie('cms_csrf', created.csrfToken, { ...sessionCookieOptions(this.config), httpOnly: false });
      const target = new URL(completion.returnTo, this.config.http.appOrigin).toString();
      return response.redirect(303, target);
    } catch (error) {
      if (!(error instanceof OidcValidationError) && !(error instanceof SessionAuthenticationError)) throw error;
      const candidate = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined;
      const errorCode = typeof candidate === 'string' && /^[A-Z0-9_]+$/.test(candidate) ? candidate : 'OIDC_CALLBACK_FAILED';
      const login = new URL('/login', this.config.http.appOrigin);
      login.searchParams.set('oidc_error', errorCode);
      return response.redirect(303, login.toString());
    }
  }

  @Get('session')
  @UseGuards(SessionGuard)
  getSession(@Req() request: AuthenticatedRequest) {
    return { user: request.auth!.user, expiresAt: request.auth!.expiresAt };
  }

  @Get('csrf')
  @UseGuards(SessionGuard)
  getCsrf(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    const token = readCookie(request, 'cms_csrf');
    if (!token) throw new CsrfViolationError();
    response.setHeader('cache-control', 'no-store');
    return { token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, CsrfGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.sessions.revokeSession(readCookie(request, 'cms_sid'));
    response.clearCookie('cms_sid', sessionCookieOptions(this.config));
    response.clearCookie('cms_csrf', { ...sessionCookieOptions(this.config), httpOnly: false });
    return { revoked: true };
  }
}
