import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { QueueService } from '../../../platform/queue/queue.service.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { MAIL_PROVIDER_ADAPTER, type MailProviderAdapter } from '../infrastructure/providers/mail-provider.port.js';

function maskMailboxAddress(value: string): string {
  const [local, domain] = value.split('@');
  if (!domain) return '[MASKED]';
  return `${(local?.slice(0, 1) ?? '*')}***@${domain}`;
}

function safeProviderDetail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^A-Z0-9_.:-]/gi, '_').slice(0, 160);
}

@Controller('mailboxes')
@UseGuards(SessionGuard, PolicyGuard)
export class MailboxAdminController {
  constructor(
    private readonly repository: EmailPrismaRepository,
    private readonly queue: QueueService,
    @Inject(MAIL_PROVIDER_ADAPTER) private readonly provider: MailProviderAdapter,
    private readonly audit: AuditWriter,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/health')
  @RequirePermission('email.read', 'NORMAL')
  async health(@Param('id') id: string) {
    const mailbox = await this.repository.findMailbox(id);
    if (!mailbox) throw Object.assign(new Error('MAILBOX_NOT_FOUND'), { code: 'MAILBOX_NOT_FOUND', statusCode: 404, messageKey: 'errors.mailboxNotFound' });
    const [provider, queue] = await Promise.all([this.readProviderHealth(), this.queue.healthCounts()]);
    const cursorAgeSeconds = mailbox.syncCursorIssuedAt
      ? Math.max(0, Math.floor((Date.now() - mailbox.syncCursorIssuedAt.getTime()) / 1000))
      : null;
    return {
      id: mailbox.id,
      address: maskMailboxAddress(mailbox.address),
      provider: mailbox.provider,
      status: mailbox.status,
      lastSyncAt: mailbox.lastSyncAt,
      lastSendAt: mailbox.lastSendAt,
      subscriptionExpiresAt: mailbox.providerSubscriptionExpiresAt,
      cursorAgeSeconds,
      queue,
      providerHealth: provider,
    };
  }

  private async readProviderHealth(): Promise<{ status: string; checkedAt: Date; authExpiresAt: Date | null; detail?: string }> {
    try {
      const health = await this.provider.validateConnection();
      const detail = safeProviderDetail(health.detail);
      return {
        status: health.status,
        checkedAt: health.checkedAt,
        authExpiresAt: health.authExpiresAt ?? null,
        ...(detail ? { detail } : {}),
      };
    } catch (error) {
      const candidate = error as { code?: unknown };
      const detail = safeProviderDetail(typeof candidate.code === 'string' ? candidate.code : 'PROVIDER_HEALTH_UNAVAILABLE');
      return { status: 'failed', checkedAt: new Date(), authExpiresAt: null, ...(detail ? { detail } : {}) };
    }
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.retry', 'NORMAL')
  async pause(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const changed = await this.repository.pauseMailboxOperator(id);
    if (!changed) throw Object.assign(new Error('MAILBOX_STATE_CONFLICT'), { code: 'MAILBOX_STATE_CONFLICT', statusCode: 409, messageKey: 'errors.conflict' });
    await this.auditMutation(request, 'MAILBOX_PAUSED', id);
    return { id, status: 'PAUSED_OPERATOR' };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.retry', 'NORMAL')
  async resume(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const changed = await this.repository.resumeMailbox(id);
    if (!changed) throw Object.assign(new Error('MAILBOX_RESUME_BLOCKED'), { code: 'MAILBOX_RESUME_BLOCKED', statusCode: 409, messageKey: 'errors.mailProviderDisabled' });
    await this.auditMutation(request, 'MAILBOX_RESUMED', id);
    return { id, status: 'HEALTHY' };
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.retry', 'NORMAL')
  async sync(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    if (!this.queue.enabled) throw Object.assign(new Error('QUEUE_DISABLED'), { code: 'QUEUE_DISABLED', statusCode: 503, messageKey: 'errors.serviceUnavailable' });
    const context = getRequestContext();
    await this.queue.enqueue('mail-sync', { schemaVersion: 1, eventId: `mail-sync:${id}:${Date.now()}`, correlationId: context?.correlationId ?? request.auth!.sessionId, entityId: id, mailboxId: id });
    await this.auditMutation(request, 'MAILBOX_SYNC_REQUESTED', id);
    return { id, status: 'QUEUED' };
  }

  private async auditMutation(request: AuthenticatedRequest, action: string, mailboxId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => this.audit.append(transaction, {
      actorUserId: request.auth!.userId,
      sessionId: request.auth!.sessionId,
      action,
      entityType: 'MAILBOX',
      entityId: mailboxId,
      correlationId: getRequestContext()?.correlationId ?? request.auth!.sessionId,
    }));
  }
}
