import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from './guards/session.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { UpdateCurrentUserDto } from './update-current-user.dto.js';
import { SessionService } from '../application/session.service.js';

/** Compatibility endpoint used by the web application shell. */
@Controller()
export class CurrentUserController {
  constructor(private readonly sessions: SessionService) {}

  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return request.auth!.user;
  }

  @Patch('me')
  @UseGuards(SessionGuard, CsrfGuard)
  updateCurrentUser(@Req() request: AuthenticatedRequest, @Body() body: UpdateCurrentUserDto) {
    return this.sessions.updateOwnProfile(request.auth!.userId, body);
  }
}
