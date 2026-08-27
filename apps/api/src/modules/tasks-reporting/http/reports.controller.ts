import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { ReportQueryService, type ReportResult, type ReportScope } from '../application/report-query.service.js';
import { REPORT_DEFINITIONS } from '../domain/report.rules.js';

const DEFAULT_REPORT_TIME_ZONE = 'Asia/Tokyo';
const PROXY_TIME_ZONE_HEADERS = ['x-vercel-ip-timezone', 'cf-timezone', 'x-geo-timezone'] as const;

function validTimeZone(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return undefined;
  }
}

function requestTimeZone(query: Record<string, string | undefined>, request: AuthenticatedRequest): string {
  const explicit = validTimeZone(query.timeZone ?? query.timezone);
  if (explicit) return explicit;
  for (const header of PROXY_TIME_ZONE_HEADERS) {
    const value = request.headers[header];
    const candidate = Array.isArray(value) ? value[0] : value;
    const fromProxy = validTimeZone(typeof candidate === 'string' ? candidate : undefined);
    if (fromProxy) return fromProxy;
  }
  return DEFAULT_REPORT_TIME_ZONE;
}

@Controller('reports') @UseGuards(SessionGuard, PolicyGuard) @RequirePermission('report.view')
export class ReportsController {
  constructor(private readonly reports: ReportQueryService) {}
  @Get('summary')
  async summary(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) {
    const primary = await this.run('candidate_inventory', query, request);
    const relatedCodes = ['application_conversion', 'order_pipeline', 'journey_progress', 'email_operations', 'task_workload'] as const;
    const related = await Promise.all(relatedCodes.map((code) => this.run(code, query, request).then(({ result }) => result)));
    return this.toSummary(primary.result, query, primary.requestId, related);
  }
  @Get('funnel') funnel(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) { return this.run('application_conversion', query, request).then(({ result }) => this.toFunnel(result, query)); }
  @Get(':code') generic(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest, @Param('code') code: string) { return this.runCode(code, query, request); }
  private run(code: keyof typeof REPORT_DEFINITIONS, query: Record<string, string | undefined>, request: AuthenticatedRequest) { const rc = getRequestContext(); const from = new Date(query.from ?? new Date(Date.now() - 86_400_000).toISOString()); const to = new Date(query.to ?? new Date().toISOString()); const team = request.auth!.roles.some((role) => ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(role.scope ?? '')); const scope: ReportScope = { actorId: request.auth!.userId, teamId: request.auth!.teamId, scope: team ? 'TEAM' : 'SELF' }; const allowed = new Set(REPORT_DEFINITIONS[code].filters); const filters = Object.fromEntries(Object.entries(query).filter(([key, value]) => value && allowed.has(key)).map(([key, value]) => [key, value!])); return this.reports.query({ code, from, to, timezone: requestTimeZone(query, request), filters }, scope).then((result) => ({ result, requestId: rc?.requestId ?? 'unknown-request' })); }
  private drilldownPath(code: string, dimension?: string) {
    return `/reports/${code}${dimension ? `?dimension=${encodeURIComponent(dimension)}` : ''}`;
  }
  private funnelDrilldownPath(stageKey: string) {
    return `/reports/funnel?dimension=${encodeURIComponent(stageKey)}`;
  }
  private toSummary(result: ReportResult, query: Record<string, string | undefined>, requestId: string, related: ReportResult[]) {
    const asOf = result.window.to;
    const ratio = (numerator: number, denominator: number) => denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
    const metric = (key: string, label: string, value: number, unit: 'COUNT' | 'PERCENT' = 'COUNT') => ({ key, label, value, numerator: result.numerator, denominator: result.denominator, unit, asOf, drilldownHref: this.drilldownPath(key) });
    const section = (code: string) => {
      const source = related.find((item) => item.code === code) ?? (result.code === code ? result : undefined);
      return source?.rows.map((row) => {
        const numerator = Number(row.payload.numerator ?? 0);
        const denominator = Number(row.payload.denominator ?? 0);
        return { key: `${code}:${row.dimensionKey}`, label: row.dimensionKey, value: ratio(numerator, denominator), numerator, denominator, unit: 'PERCENT' as const, asOf: row.asOf, drilldownHref: this.drilldownPath(code, row.dimensionKey) };
      }) ?? [];
    };
    return { filters: { from: query.from ?? null, to: query.to ?? null, teamId: query.teamId ?? null, ownerId: query.ownerId ?? null, clientId: query.clientId ?? null, orderId: query.orderId ?? null, industryId: query.industryId ?? null, sourceId: query.sourceId ?? null, timeZone: result.window.timezone }, asOf, metrics: [metric(result.code, result.code, result.value ?? 0, result.denominator ? 'PERCENT' : 'COUNT')], sourceQuality: section('application_conversion'), clients: section('order_pipeline'), journeys: section('journey_progress'), mailbox: section('email_operations'), workload: section('task_workload'), dataQuality: section('candidate_inventory') };
  }
  private toFunnel(result: Awaited<ReturnType<ReportQueryService['query']>>, query: Record<string, string | undefined>) {
    const asOf = result.window.to;
    const ratio = (numerator: number, denominator: number) => denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
    const stages = result.rows.length ? result.rows.map((row) => { const numerator = Number(row.payload.numerator ?? 0); const denominator = Number(row.payload.denominator ?? 0); return { key: row.dimensionKey, label: row.dimensionKey, numerator, denominator, rate: ratio(numerator, denominator), drilldownHref: this.funnelDrilldownPath(row.dimensionKey) }; }) : [{ key: result.code, label: result.code, numerator: result.numerator, denominator: result.denominator, rate: ratio(result.numerator, result.denominator), drilldownHref: this.drilldownPath(result.code) }];
    return { asOf, timeZone: query.timeZone ?? query.timezone ?? result.window.timezone, stages };
  }
  private runCode(code: string, query: Record<string, string | undefined>, request: AuthenticatedRequest) { return this.run(code as keyof typeof REPORT_DEFINITIONS, query, request); }
}
