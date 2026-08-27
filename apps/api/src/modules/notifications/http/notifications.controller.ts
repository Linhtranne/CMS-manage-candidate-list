import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { NotificationService } from '../application/notification.service.js';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@Query('limit') limit: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.auth!.userId, limit);
  }

  @Post('read-all')
  @UseGuards(CsrfGuard)
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(request.auth!.userId);
  }

  @Post(':id/read')
  @UseGuards(CsrfGuard)
  markRead(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthenticatedRequest) {
    return this.notifications.markRead(request.auth!.userId, id);
  }
}
