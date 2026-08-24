import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { ReportQueryService, type ReportScope } from '../application/report-query.service.js';

@Controller('reports') @UseGuards(SessionGuard, PolicyGuard) @RequirePermission('report.view')
export class ReportsController {
  constructor(private readonly reports: ReportQueryService) {}
  @Get('summary') summary(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) { return this.run('candidate_inventory', query, request).then(({ result, requestId }) => this.toSummary(result, query, requestId)); }
  @Get('funnel') funnel(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) { return this.run('application_conversion', query, request).then(({ result }) => this.toFunnel(result, query)); }
  @Get(':code') generic(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest, @Param('code') code: string) { return this.runCode(code, query, request); }
  private run(code: 'candidate_inventory' | 'application_conversion', query: Record<string, string | undefined>, request: AuthenticatedRequest) { const rc = getRequestContext(); const from = new Date(query.from ?? new Date(Date.now() - 86_400_000).toISOString()); const to = new Date(query.to ?? new Date().toISOString()); const team = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')); const scope: ReportScope = { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: team ? 'TEAM' : 'SELF' }; return this.reports.query({ code, from, to, timezone: query.timeZone ?? query.timezone ?? 'Asia/Tokyo', filters: Object.fromEntries(Object.entries(query).filter(([key, value]) => value && ['teamId', 'ownerId', 'clientId', 'orderId', 'industryId', 'sourceId', 'source'].includes(key)).map(([key, value]) => [key, value!])) }, scope).then((result) => ({ result, requestId: rc?.requestId ?? 'unknown-request' })); }
  private toSummary(result: Awaited<ReturnType<ReportQueryService['query']>>, query: Record<string, string | undefined>, requestId: string) {
    const asOf = result.window.to;
    const metric = (key: string, label: string, value: number, unit: 'COUNT' | 'PERCENT' = 'COUNT') => ({ key, label, value, numerator: result.numerator, denominator: result.denominator, unit, asOf, drilldownHref: `/reports/${key}?requestId=${requestId}` });
    return { filters: { from: query.from ?? null, to: query.to ?? null, teamId: query.teamId ?? null, ownerId: query.ownerId ?? null, clientId: query.clientId ?? null, orderId: query.orderId ?? null, industryId: query.industryId ?? null, sourceId: query.sourceId ?? null, timeZone: result.window.timezone }, asOf, metrics: [metric(result.code, result.code, result.value ?? 0, result.denominator ? 'PERCENT' : 'COUNT')], sourceQuality: [], clients: [], journeys: [], mailbox: [], workload: [], dataQuality: [] };
  }
  private toFunnel(result: Awaited<ReturnType<ReportQueryService['query']>>, query: Record<string, string | undefined>) {
    const asOf = result.window.to;
    const stages = result.rows.length ? result.rows.map((row) => ({ key: row.dimensionKey, label: row.dimensionKey, numerator: Number(row.payload.numerator ?? 0), denominator: Number(row.payload.denominator ?? 0), rate: Number(row.payload.denominator ?? 0) ? Number(row.payload.numerator ?? 0) / Number(row.payload.denominator ?? 0) : 0, drilldownHref: `/reports/funnel?dimension=${encodeURIComponent(row.dimensionKey)}` })) : [{ key: result.code, label: result.code, numerator: result.numerator, denominator: result.denominator, rate: result.value ?? 0, drilldownHref: '/reports/funnel' }];
    return { asOf, timeZone: query.timeZone ?? query.timezone ?? result.window.timezone, stages };
  }
  private runCode(code: string, query: Record<string, string | undefined>, request: AuthenticatedRequest) { return this.run(code as 'candidate_inventory' | 'application_conversion', query, request); }
}
