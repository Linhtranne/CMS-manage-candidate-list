import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { EmailCommandService } from '../application/email-command.service.js';
import { EmailInboundService } from '../application/email-inbound.service.js';
import { EmailQueryService, serializeEmailMessage } from '../application/email-query.service.js';
import { CreateEmailDraftDto, CreateEmailPreviewDto, ResolveEmailMatchDto, SendConversationDto } from './emails.dto.js';

function commandContext(request: AuthenticatedRequest) {
  const context = getRequestContext();
  return {
    actorId: request.auth!.userId,
    userId: request.auth!.userId,
    teamId: request.auth!.teamId,
    roles: request.auth!.roles,
    requestId: context?.requestId ?? request.auth!.sessionId,
    correlationId: context?.correlationId ?? request.auth!.sessionId,
  };
}

@Controller('email-previews')
@UseGuards(SessionGuard, PolicyGuard)
export class LegacyEmailPreviewController {
  constructor(private readonly commands: EmailCommandService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  create(@Body() body: CreateEmailPreviewDto, @Req() request: AuthenticatedRequest) {
    return this.commands.preview(body, commandContext(request));
  }
}

@Controller('conversations')
@UseGuards(SessionGuard, PolicyGuard)
export class LegacyConversationMessagesController {
  constructor(private readonly queries: EmailQueryService, private readonly commands: EmailCommandService) {}

  @Get(':id/messages')
  async list(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const detail = await this.queries.get(id, commandContext(request));
    const context = getRequestContext();
    return {
      data: { items: detail.messages },
      page: { hasMore: false, nextCursor: null },
      requestId: context?.requestId ?? request.auth!.sessionId,
    };
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  send(@Param('id') id: string, @Body() body: SendConversationDto, @Req() request: AuthenticatedRequest) {
    return this.commands.sendConversation({ ...body, conversationId: id }, commandContext(request));
  }
}

@Controller('inbox/messages')
@UseGuards(SessionGuard, PolicyGuard)
export class LegacyInboxMatchController {
  constructor(private readonly inbound: EmailInboundService) {}

  @Post(':id/match-decisions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.manual_link', 'NORMAL')
  resolve(@Param('id') messageId: string, @Body() body: ResolveEmailMatchDto, @Req() request: AuthenticatedRequest) {
    return this.inbound.resolveMatch({ messageId, ...body, ...commandContext(request) });
  }
}

@Controller('email-drafts')
@UseGuards(SessionGuard, PolicyGuard)
export class LegacyEmailDraftController {
  constructor(private readonly commands: EmailCommandService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  async create(@Body() body: CreateEmailDraftDto, @Req() request: AuthenticatedRequest) {
    const message = await this.commands.createDraft(body, commandContext(request));
    return serializeEmailMessage(message as never);
  }
}
