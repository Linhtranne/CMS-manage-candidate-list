import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { EmailCommandService } from '../application/email-command.service.js';
import { EmailActionDto } from './emails.dto.js';

@Controller('email-messages')
@UseGuards(SessionGuard, PolicyGuard)
export class EmailMessagesController {
  constructor(private readonly commands: EmailCommandService) {}

  @Post(':id/cancellations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.retry', 'NORMAL')
  cancel(@Param('id') id: string, @Body() body: EmailActionDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    return this.commands.cancel(id, {
      actorId: request.auth!.userId,
      requestId: context?.requestId ?? request.auth!.sessionId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
      reason: body.reason,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
    });
  }

  @Post(':id/retry-attempts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @RequirePermission('email.retry', 'NORMAL')
  retry(@Param('id') id: string, @Body() body: EmailActionDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    return this.commands.retry(id, {
      actorId: request.auth!.userId,
      requestId: context?.requestId ?? request.auth!.sessionId,
      correlationId: context?.correlationId ?? request.auth!.sessionId,
      reason: body.reason,
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
    });
  }
}
