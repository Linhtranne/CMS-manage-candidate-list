import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { EmailCommandService, type EnqueueEmailInput } from '../application/email-command.service.js';
import { EmailInboundService } from '../application/email-inbound.service.js';
import { CreateEmailPreviewDto, EnqueueEmailDto, ResolveEmailMatchDto } from './emails.dto.js';

@Controller('emails')
@UseGuards(SessionGuard, PolicyGuard)
export class EmailsController {
  constructor(private readonly commands: EmailCommandService, private readonly inbound: EmailInboundService) {}

  @Post('previews')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  createPreview(@Body() body: CreateEmailPreviewDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    return this.commands.preview(body, {
      actorId: request.auth!.userId,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
      requestId: context?.requestId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.send', 'NORMAL')
  enqueue(@Body() body: EnqueueEmailDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    const input: EnqueueEmailInput = body;
    return this.commands.enqueue(input, {
      actorId: request.auth!.userId,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
      requestId: context?.requestId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
    });
  }

  @Post(':id/match-resolution')
  @UseGuards(CsrfGuard)
  @RequirePermission('email.manual_link', 'NORMAL')
  resolveMatch(@Param('id') messageId: string, @Body() body: ResolveEmailMatchDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    return this.inbound.resolveMatch({
      messageId,
      candidateId: body.candidateId,
      reason: body.reason,
      actorId: request.auth!.userId,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
      applicationId: body.applicationId,
      journeyId: body.journeyId,
    });
  }
}
