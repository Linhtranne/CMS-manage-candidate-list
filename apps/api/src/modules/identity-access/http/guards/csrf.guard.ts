import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { CsrfViolationError, SessionService } from '../../application/session.service.js';
import type { AuthenticatedRequest } from './session.guard.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers['x-csrf-token'];
    const csrfToken = Array.isArray(header) ? header[0] : header;
    if (!request.auth) throw new CsrfViolationError();
    this.sessions.assertCsrf(request.auth, csrfToken);
    return true;
  }
}
