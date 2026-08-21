import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { PolicyService } from '../../identity-access/application/policy.service.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { EmailPrismaRepository } from '../infrastructure/email.prisma-repository.js';
import { EMAIL_CONVERSATION_VIEWS, type ConversationQueryInput, type EmailConversationView } from '../infrastructure/email.prisma-repository.js';
import { EmailQueryService, serializeConversation } from '../application/email-query.service.js';
import { EmailCommandService } from '../application/email-command.service.js';
import { LinkConversationDto, SendConversationDto } from './emails.dto.js';

@Controller('mailbox/conversations')
@UseGuards(SessionGuard, PolicyGuard)
export class ConversationsController {
  constructor(
    private readonly repository: EmailPrismaRepository,
    private readonly policy: PolicyService,
    private readonly audit: AuditWriter,
    private readonly prisma: PrismaService,
    private readonly queries: EmailQueryService,
    private readonly commands: EmailCommandService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  @Get()
  @RequirePermission('email.read', 'NORMAL')
  async list(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) {
    const result = await this.queries.list(this.parseQuery(query), this.actor(request));
    return { data: { items: result.items }, page: result.page, requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  @Get(':id')
  @RequirePermission('email.read', 'NORMAL')
  async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return { data: await this.queries.get(id, this.actor(request)), requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  async send(@Param('id') id: string, @Body() body: SendConversationDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    const result = await this.commands.sendConversation({ ...body, conversationId: id, body: body.body, to: body.to, cc: body.cc, attachmentIds: body.attachmentIds }, {
      actorId: request.auth!.userId,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
      requestId: context?.requestId ?? request.auth!.sessionId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
    });
    return { data: result, requestId: context?.requestId ?? request.auth!.sessionId };
  }

  @Post(':id/link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.manual_link', 'NORMAL')
  async link(@Param('id') id: string, @Body() body: LinkConversationDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    const conversation = await this.commands.linkConversation(id, body, {
      actorId: request.auth!.userId,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
      requestId: context?.requestId ?? request.auth!.sessionId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
    });
    return { data: serializeConversation(conversation as never), requestId: context?.requestId ?? request.auth!.sessionId };
  }

  @Post(':conversationId/attachments/:attachmentId/download')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('document.download', 'PERSONAL')
  async createAttachmentDownload(@Param('conversationId') conversationId: string, @Param('attachmentId') attachmentId: string, @Req() request: AuthenticatedRequest) {
    const attachment = await this.repository.findAttachmentForDownload(attachmentId, conversationId);
    if (!attachment || attachment.status !== 'SAFE' || !attachment.message.conversation.candidate) {
      throw Object.assign(new Error('ATTACHMENT_NOT_SAFE'), { code: 'ATTACHMENT_NOT_SAFE', statusCode: 409, messageKey: 'errors.attachmentNotSafe' });
    }
    this.policy.assert({
      actor: { userId: request.auth!.userId, status: request.auth!.user.status as 'ACTIVE', teamId: request.auth!.teamId, roles: request.auth!.roles },
      action: 'document.download',
      sensitivity: 'PERSONAL',
      resource: { ownerUserId: attachment.message.conversation.candidate.ownerId, teamId: attachment.message.conversation.candidate.teamId ?? undefined },
    });
    const signed = await this.storage.createSignedDownload(attachment.objectKey, 300);
    await this.prisma.$transaction(async (transaction) => this.audit.append(transaction, {
      actorUserId: request.auth!.userId,
      sessionId: request.auth!.sessionId,
      action: 'EMAIL_ATTACHMENT_DOWNLOAD_CREATED',
      entityType: 'EMAIL_ATTACHMENT',
      entityId: attachment.id,
      correlationId: getRequestContext()?.correlationId ?? request.auth!.sessionId,
      metadataJson: { conversationId, attachmentId: attachment.id, expiresAt: signed.expiresAt.toISOString() },
    }));
    return { attachmentId: attachment.id, url: signed.url, expiresAt: signed.expiresAt };
  }

  private parseQuery(query: Record<string, string | undefined>): ConversationQueryInput {
    const allowed = new Set(['query', 'view', 'journeyId', 'cursor', 'limit']);
    const unknown = Object.keys(query).filter((key) => !allowed.has(key));
    if (unknown.length) throw Object.assign(new Error('UNSUPPORTED_CONVERSATION_FILTER'), { code: 'UNSUPPORTED_CONVERSATION_FILTER', statusCode: 422 });
    const view = query.view as EmailConversationView | undefined;
    if (view && !(EMAIL_CONVERSATION_VIEWS as readonly string[]).includes(view)) {
      throw Object.assign(new Error('INVALID_CONVERSATION_VIEW'), { code: 'INVALID_CONVERSATION_VIEW', statusCode: 422 });
    }
    return {
      query: query.query,
      view,
      journeyId: query.journeyId,
      cursor: query.cursor,
      limit: query.limit === undefined ? undefined : Number(query.limit),
      scope: { denied: false, includeUnmatched: false, candidateClauses: [] },
    };
  }

  private actor(request: AuthenticatedRequest) {
    return { userId: request.auth!.userId, status: request.auth!.user.status as 'ACTIVE', teamId: request.auth!.teamId, roles: request.auth!.roles };
  }
}
