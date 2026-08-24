import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from './guards/session.guard.js';

/** Compatibility endpoint used by the web application shell. */
@Controller()
export class CurrentUserController {
  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return request.auth!.user;
  }
}
