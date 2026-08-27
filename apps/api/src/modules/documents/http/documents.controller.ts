import { Body, Controller, Param, Post, Get, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { DocumentService, type DocumentScopeContext } from '../application/document.service.js';
import { CreateDocumentUploadDto, LinkDocumentDto } from './document.dto.js';

@Controller('documents') @UseGuards(SessionGuard, PolicyGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentService) {}
  @Post('uploads') @UseGuards(CsrfGuard) @RequirePermission('document.upload') create(@Body() body: CreateDocumentUploadDto, @Req() request: AuthenticatedRequest) { const context = this.context(request); return this.documents.createUpload({ ...body, ownerUserId: context.actorId }, context); }
  @Get(':id') @RequirePermission('supply_journey.view') get(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.documents.get(id, this.context(request)); }
  @Post(':id/verification') @UseGuards(CsrfGuard) @RequirePermission('document.upload') finalize(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.documents.finalizeUpload(id, this.context(request)); }
  @Post(':id/links') @UseGuards(CsrfGuard) @RequirePermission('document.upload') link(@Param('id') id: string, @Body() body: LinkDocumentDto, @Req() request: AuthenticatedRequest) { return this.documents.link(id, body, this.context(request)); }
  @Post(':id/downloads') @UseGuards(CsrfGuard) @RequirePermission('document.download') download(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.documents.createDownload(id, this.context(request)); }
  private context(request: AuthenticatedRequest): DocumentScopeContext { const rc = getRequestContext(); const team = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')); return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: team ? 'TEAM' : 'SELF', requestId: rc?.requestId ?? 'unknown-request', correlationId: rc?.correlationId ?? 'unknown-correlation' }; }
}
