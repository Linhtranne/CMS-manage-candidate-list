import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CatalogService } from '../application/catalog.service.js';
import { CatalogApprovalGate } from '../application/catalog-approval.gate.js';
import { CreateCatalogDto, VersionedCatalogActionDto } from './catalog.dto.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';

@Controller('admin/catalogs')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('catalog.configure')
export class CatalogController {
  constructor(private readonly catalogs: CatalogService, private readonly approvalGate: CatalogApprovalGate) {}

  @Get()
  async list(@Query('type') type?: string) {
    const items = await this.catalogs.list(type);
    return { items: items.map((item) => ({
      id: item.id,
      type: item.type,
      code: item.code,
      label: item.labelVi,
      version: item.version,
      status: item.status,
      usageCount: item.usageCount,
    })) };
  }

  @Post()
  @UseGuards(CsrfGuard)
  async create(@Body() body: CreateCatalogDto, @Req() request: AuthenticatedRequest) {
    return this.catalogs.createDraft({ type: body.type, code: body.code, labelVi: body.label }, this.context(request));
  }

  @Post(':id/activate')
  @UseGuards(CsrfGuard)
  async activate(@Param('id') id: string, @Body() body: VersionedCatalogActionDto, @Req() request: AuthenticatedRequest) {
    return this.catalogs.activate(id, body.version, this.context(request, true));
  }

  @Post(':id/retire')
  @UseGuards(CsrfGuard)
  async retire(@Param('id') id: string, @Body() body: VersionedCatalogActionDto, @Req() request: AuthenticatedRequest) {
    return this.catalogs.retire(id, body.version, this.context(request, true));
  }

  private context(request: AuthenticatedRequest, requireCatalogApproval = false) {
    const context = getRequestContext();
    return {
      actorId: request.auth!.userId,
      requestId: context?.requestId ?? 'unknown-request',
      correlationId: context?.correlationId ?? 'unknown-correlation',
      ...(requireCatalogApproval ? { approval: this.approvalGate.getApproved() } : {}),
    };
  }
}
