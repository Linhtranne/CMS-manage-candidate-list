import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { SavedViewsService } from '../application/saved-views.service.js';
import { SaveViewDto } from './saved-views.dto.js';

@Controller('saved-views')
@UseGuards(SessionGuard, PolicyGuard)
export class SavedViewsController {
  constructor(private readonly savedViews: SavedViewsService) {}

  @Get()
  @RequirePermission('saved_view.view')
  async list(@Query('resource') resource: string, @Req() request: AuthenticatedRequest) {
    const items = await this.savedViews.list(resource, this.context(request));
    return { data: { items }, page: { nextCursor: null, hasMore: false }, requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('saved_view.manage')
  create(@Body() body: SaveViewDto, @Req() request: AuthenticatedRequest) {
    return this.savedViews.create(body, this.context(request));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('saved_view.manage')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: SaveViewDto, @Req() request: AuthenticatedRequest) {
    return this.savedViews.update(id, body, this.context(request));
  }

  private context(request: AuthenticatedRequest) {
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, roles: request.auth!.roles };
  }
}
