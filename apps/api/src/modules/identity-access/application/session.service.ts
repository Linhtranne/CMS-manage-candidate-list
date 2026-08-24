import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { AuditWriter } from '../../../modules/audit/audit-writer.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import type { OidcClaims } from '../infrastructure/oidc.adapter.js';
import { verifyPassword } from '../infrastructure/password-hasher.js';
import { ROLE_ACTION_SCOPES, type ActorRole, type PermissionAction, type ScopeLevel } from '../domain/permission.registry.js';

const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;
const IDLE_SESSION_MS = 30 * 60 * 1000;

export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  status: string;
  roles: string[];
  permissions: PermissionAction[];
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  sessionHash: string;
  csrfHash: string;
  expiresAt: Date;
  user: SessionUser;
  roles: ActorRole[];
  teamId?: string;
}

export interface CreatedSession {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  user: SessionUser;
}

export class SessionAuthenticationError extends Error {
  readonly statusCode = 401;
  readonly code = 'UNAUTHENTICATED';
  readonly messageKey = 'errors.unauthenticated';

  constructor(message = 'Session is not valid') {
    super(message);
    this.name = 'SessionAuthenticationError';
  }
}

export class PasswordAuthenticationError extends Error {
  readonly statusCode = 401;
  readonly code = 'INVALID_CREDENTIALS';
  readonly messageKey = 'errors.invalidCredentials';

  constructor() {
    super('Invalid credentials');
    this.name = 'PasswordAuthenticationError';
  }
}

export class CsrfViolationError extends Error {
  readonly statusCode = 403;
  readonly code = 'CSRF_INVALID';
  readonly messageKey = 'errors.csrfInvalid';

  constructor() {
    super('CSRF token is missing or invalid');
    this.name = 'CsrfViolationError';
  }
}

function token(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function toUser(
  user: { id: string; displayName: string; email: string; status: string },
  userRoles: Array<{ role: { code: string } }> = [],
): SessionUser {
  const roles = userRoles.map((entry) => entry.role.code);
  const permissions = [...new Set(roles.flatMap((role) => Object.keys(ROLE_ACTION_SCOPES[role] ?? {})))] as PermissionAction[];
  return { id: user.id, displayName: user.displayName, email: user.email, status: user.status, roles, permissions };
}

function toRoles(userRoles: Array<{ scope: string; role: { code: string } }>): ActorRole[] {
  const scopes: ScopeLevel[] = ['SELF', 'ASSIGNED', 'TEAM', 'DEPARTMENT', 'COMPANY'];
  return userRoles.map((entry) => ({ code: entry.role.code, scope: scopes.includes(entry.scope as ScopeLevel) ? entry.scope as ScopeLevel : 'TEAM' }));
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditWriter,
  ) {}

  private correlationId(): string { return getRequestContext()?.correlationId ?? `auth_${Date.now()}`; }

  private async appendAudit(event: Parameters<AuditWriter['append']>[1]): Promise<void> {
    if (!this.audit || typeof (this.prisma as unknown as { $transaction?: unknown }).$transaction !== 'function') return;
    await this.prisma.$transaction(async (tx) => { await this.audit!.append(tx, event); });
  }

  private async appendAuditSafely(event: Parameters<AuditWriter['append']>[1]): Promise<void> {
    try {
      await this.appendAudit(event);
    } catch {
      // Preserve the authentication failure when the audit store is unavailable.
    }
  }

  async createSession(userId: string): Promise<CreatedSession> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } });
    if (!user || user.status !== 'ACTIVE') {
      await this.appendAuditSafely({
        actorUserId: user?.id ?? userId,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'SESSION',
        correlationId: this.correlationId(),
        metadataJson: { reason: user ? 'USER_NOT_ACTIVE' : 'USER_NOT_FOUND' },
      });
      throw new SessionAuthenticationError('User is not active');
    }
    const sessionToken = token();
    const csrfToken = token();
    const expiresAt = new Date(Date.now() + ABSOLUTE_SESSION_MS);
    const sessionHash = hashToken(sessionToken, this.config.security.sessionSecret);
    const csrfHash = hashToken(csrfToken, this.config.security.sessionSecret);
    if (this.audit && typeof (this.prisma as unknown as { $transaction?: unknown }).$transaction === 'function') {
      await this.prisma.$transaction(async (tx) => {
        const session = await tx.session.create({ data: { userId, sessionHash, csrfHash, expiresAt } });
        await this.audit!.append(tx, { actorUserId: userId, sessionId: session.id, action: 'AUTH_LOGIN_SUCCESS', entityType: 'SESSION', entityId: session.id, correlationId: this.correlationId() });
      });
    } else {
      await this.prisma.session.create({ data: { userId, sessionHash, csrfHash, expiresAt } });
    }
    return { sessionToken, csrfToken, expiresAt, user: toUser(user, user.userRoles) };
  }

  async authenticateWithPassword(email: string, password: string): Promise<CreatedSession> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { userRoles: { include: { role: true } } },
    });
    const valid = Boolean(user?.passwordHash) && await verifyPassword(password, user?.passwordHash ?? '');
    if (!user || user.status !== 'ACTIVE' || !valid) {
      await this.appendAuditSafely({
        actorUserId: user?.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'SESSION',
        correlationId: this.correlationId(),
        metadataJson: { reason: 'INVALID_CREDENTIALS' },
      });
      throw new PasswordAuthenticationError();
    }
    return this.createSession(user.id);
  }

  async establishFromOidc(claims: OidcClaims): Promise<CreatedSession> {
    const link = await this.prisma.identityLink.findUnique({
      where: { issuer_subject: { issuer: claims.issuer, subject: claims.subject } },
      include: { user: true },
    });
    if (!link || link.user.status !== 'ACTIVE') {
      await this.appendAuditSafely({ action: 'AUTH_LOGIN_FAILED', entityType: 'SESSION', correlationId: this.correlationId(), metadataJson: { reason: 'IDENTITY_NOT_LINKED_OR_INACTIVE' } });
      throw new SessionAuthenticationError('OIDC identity is not linked to an active user');
    }
    return this.createSession(link.user.id);
  }

  async validateSession(sessionToken: string | undefined): Promise<SessionContext> {
    if (!sessionToken) throw new SessionAuthenticationError();
    const session = await this.prisma.session.findUnique({
      where: { sessionHash: hashToken(sessionToken, this.config.security.sessionSecret) },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    });
    const now = Date.now();
    if (!session) throw new SessionAuthenticationError();
    const rejectionReason = session.revokedAt ? 'REVOKED'
      : session.expiresAt.getTime() <= now ? 'EXPIRED'
        : session.lastSeenAt.getTime() + IDLE_SESSION_MS <= now ? 'IDLE_TIMEOUT'
          : session.user.status !== 'ACTIVE' ? 'USER_NOT_ACTIVE' : undefined;
    if (rejectionReason) {
      await this.appendAuditSafely({
        actorUserId: session.userId,
        sessionId: session.id,
        action: 'AUTH_SESSION_REJECTED',
        entityType: 'SESSION',
        entityId: session.id,
        correlationId: this.correlationId(),
        metadataJson: { reason: rejectionReason },
      });
      throw new SessionAuthenticationError();
    }
    await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    return {
      sessionId: session.id,
      userId: session.userId,
      sessionHash: session.sessionHash,
      csrfHash: session.csrfHash,
      expiresAt: session.expiresAt,
      user: toUser(session.user, session.user.userRoles),
      roles: toRoles(session.user.userRoles),
      teamId: session.user.teamId ?? undefined,
    };
  }

  assertCsrf(context: SessionContext, csrfToken: string | undefined): void {
    if (!csrfToken) throw new CsrfViolationError();
    const expected = Buffer.from(context.csrfHash);
    const actual = Buffer.from(hashToken(csrfToken, this.config.security.sessionSecret));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new CsrfViolationError();
  }

  async revokeSession(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    const sessionHash = hashToken(sessionToken, this.config.security.sessionSecret);
    const session = await this.prisma.session.findUnique({ where: { sessionHash } });
    if (!session || session.revokedAt) return;
    if (this.audit && typeof (this.prisma as unknown as { $transaction?: unknown }).$transaction === 'function') {
      await this.prisma.$transaction(async (tx) => {
        await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        await this.audit!.append(tx, { actorUserId: session.userId, sessionId: session.id, action: 'AUTH_LOGOUT', entityType: 'SESSION', entityId: session.id, correlationId: this.correlationId() });
      });
    } else {
      await this.prisma.session.updateMany({ where: { sessionHash, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
