import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CatalogApprovalGate } from '../../catalog/application/catalog-approval.gate.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { JourneyTemplateService } from '../application/journey-template.service.js';
import type { JourneyMilestoneTemplateEntity } from '../domain/journey-template.js';
import { CreateJourneyTemplateDto, VersionedJourneyTemplateActionDto } from './journey-template.dto.js';

@Controller('admin/supply-journey-templates')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('catalog.configure')
export class JourneyTemplateController {
  constructor(private readonly templates: JourneyTemplateService, private readonly approvalGate: CatalogApprovalGate) {}

  @Get()
  async list() {
    const items = await this.templates.list();
    return { items };
  }

  @Post()
  @UseGuards(CsrfGuard)
  async create(@Body() body: CreateJourneyTemplateDto, @Req() request: AuthenticatedRequest) {
    return this.templates.createDraft({
      code: body.code,
      name: body.name,
      version: body.version,
      residenceContext: body.residenceContext as never,
      visaRouteVersionId: body.visaRouteVersionId ?? null,
      caseType: body.caseType as never,
      sectorVersionId: body.sectorVersionId ?? null,
      occupationVersionId: body.occupationVersionId ?? null,
      applicability: body.applicability as never ?? null,
      milestones: body.milestones as unknown as JourneyMilestoneTemplateEntity[],
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    }, this.context(request));
  }

  @Post(':id/activate')
  @UseGuards(CsrfGuard)
  async activate(@Param('id') id: string, @Body() body: VersionedJourneyTemplateActionDto, @Req() request: AuthenticatedRequest) {
    return this.templates.activate(id, body.version, this.context(request, true));
  }

  @Post(':id/retire')
  @UseGuards(CsrfGuard)
  async retire(@Param('id') id: string, @Body() body: VersionedJourneyTemplateActionDto, @Req() request: AuthenticatedRequest) {
    return this.templates.retire(id, body.version, this.context(request, true));
  }

  private context(request: AuthenticatedRequest, requireApproval = false) {
    const context = getRequestContext();
    return {
      actorId: request.auth!.userId,
      requestId: context?.requestId ?? 'unknown-request',
      correlationId: context?.correlationId ?? 'unknown-correlation',
      ...(requireApproval ? { approval: this.approvalGate.getApproved() } : {}),
    };
  }
}

