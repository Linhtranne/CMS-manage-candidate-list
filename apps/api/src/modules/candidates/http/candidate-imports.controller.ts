import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { CandidateImportService } from '../application/import.service.js';
import { CandidateMergeService } from '../application/merge.service.js';
import { CandidateDomainError } from '../domain/candidate.rules.js';
import { CandidateImportCommandDto, CreateCandidateImportDto, DuplicateDecisionDto } from './candidate-imports.dto.js';

@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class CandidateImportsController {
  constructor(private readonly imports: CandidateImportService, private readonly merges: CandidateMergeService) {}

  @Post(['candidate-imports', 'candidates/imports'])
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.create')
  create(@Body() body: CreateCandidateImportDto, @Req() request: AuthenticatedRequest) {
    return this.imports.create({ fileName: body.fileName, rows: body.rows, mappingVersion: body.mappingVersion, ownerId: request.auth!.userId, teamId: request.auth!.teamId });
  }

  @Post('candidate-imports/preview')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.view')
  preview(@Body() body: CandidateImportCommandDto, @Req() request: AuthenticatedRequest) {
    return this.imports.preview(body.importId, request.auth!.userId, request.auth!.teamId);
  }

  @Post('candidate-imports/commit')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.create')
  commit(@Body() body: CandidateImportCommandDto, @Req() request: AuthenticatedRequest) {
    const context = getRequestContext();
    return this.imports.commit(body.importId, body.previewToken, request.auth!.userId, request.auth!.teamId, { actorId: request.auth!.userId, teamId: request.auth!.teamId, requestId: context?.requestId ?? 'unknown-request', correlationId: context?.correlationId ?? 'unknown-correlation' });
  }

  @Get('candidate-imports/:id')
  @RequirePermission('candidate.view')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.imports.preview(id, request.auth!.userId, request.auth!.teamId); }

  @Get('candidate-imports/:id/error-report')
  @RequirePermission('candidate.view')
  errorReport(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.imports.preview(id, request.auth!.userId, request.auth!.teamId); }

  @Post('candidate-duplicate-cases/:id/decisions')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.merge')
  decide(@Param('id') id: string, @Body() body: DuplicateDecisionDto, @Req() request: AuthenticatedRequest) {
    return this.merges.reviewCase(id, body, this.context(request, body.approvalId));
  }

  @Post('candidates/:id/duplicate-review')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.merge')
  async decideForCandidate(@Param('id') id: string, @Body() body: DuplicateDecisionDto, @Req() request: AuthenticatedRequest) {
    const duplicate = await this.imports.findOpenDuplicateCase(id);
    if (!duplicate) throw new CandidateDomainError('DUPLICATE_CASE_NOT_FOUND', 'duplicate case was not found', 404);
    return this.merges.reviewCase(duplicate.id, body, this.context(request, body.approvalId));
  }

  private context(request: AuthenticatedRequest, approvalId?: string) { const context = getRequestContext(); return { actorId: request.auth!.userId, teamId: request.auth!.teamId, requestId: context?.requestId ?? 'unknown-request', correlationId: context?.correlationId ?? 'unknown-correlation', ...(approvalId ? { approvalId } : {}) }; }
}
