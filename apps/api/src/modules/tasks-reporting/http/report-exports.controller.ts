import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { ReportExportService, type ExportScope } from '../application/report-export.service.js';

@Controller('reports/exports') @UseGuards(SessionGuard, PolicyGuard) @RequirePermission('export.create')
export class ReportExportsController {
  constructor(private readonly exports: ReportExportService) {}
  @Post() @UseGuards(CsrfGuard) create(@Body() body: { reportCode: string; format: 'CSV' | 'XLSX'; purpose: string; includedFields: string[]; filters: Record<string, string | string[]> }, @Req() request: AuthenticatedRequest) { return this.exports.create(body, this.scope(request)); }
  @Get(':id') get(@Param('id') id: string, @Req() request: AuthenticatedRequest) { return this.exports.get(id, this.scope(request)); }
  private scope(request: AuthenticatedRequest): ExportScope { const team = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')); return { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: team ? 'TEAM' : 'SELF' }; }
}
