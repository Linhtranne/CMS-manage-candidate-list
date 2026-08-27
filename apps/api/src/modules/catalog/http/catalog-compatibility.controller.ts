import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { CatalogService } from '../application/catalog.service.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard } from '../../identity-access/http/guards/session.guard.js';

type CatalogCompatibilityType = 'INDUSTRY' | 'OCCUPATION' | 'VISA_ROUTE';

/**
 * Compatibility reads kept for the older catalog consumers. The canonical
 * admin catalog endpoint remains /admin/catalogs; these aliases deliberately
 * expose the same database-backed versions instead of a mock list.
 */
@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class CatalogCompatibilityController {
  constructor(private readonly catalogs: CatalogService, private readonly prisma: PrismaService) {}

  @Get('industry-sectors')
  @RequirePermission('candidate.view')
  industrySectors() { return this.listActiveCatalog('INDUSTRY'); }

  @Get('occupations')
  @RequirePermission('candidate.view')
  occupations() { return this.listActiveCatalog('OCCUPATION'); }

  @Get('visa-routes')
  @RequirePermission('candidate.view')
  visaRoutes() { return this.listActiveCatalog('VISA_ROUTE'); }

  @Get('admin/industry-sectors')
  @RequirePermission('catalog.configure')
  adminIndustrySectors(@Query('status') status?: string) { return this.listAdminCatalog('INDUSTRY', status); }

  @Get('admin/occupations')
  @RequirePermission('catalog.configure')
  adminOccupations(@Query('status') status?: string) { return this.listAdminCatalog('OCCUPATION', status); }

  @Get('admin/visa-routes')
  @RequirePermission('catalog.configure')
  adminVisaRoutes(@Query('status') status?: string) { return this.listAdminCatalog('VISA_ROUTE', status); }

  @Get('admin/industry-field-definitions')
  @RequirePermission('catalog.configure')
  async industryFieldDefinitions() {
    const items = await this.catalogs.list('INDUSTRY');
    return { items: items.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.labelVi,
      version: item.version,
      status: item.status,
      schema: isRecord(item.payload.schema) ? item.payload.schema : {},
      updatedAt: item.updatedAt.toISOString(),
    })) };
  }

  @Get('admin/interview-question-templates')
  @RequirePermission('catalog.configure')
  async interviewQuestionTemplates() {
    const rows = await this.prisma.interviewQuestionTemplateVersion.findMany({
      include: { template: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return { items: rows.map((row) => ({
      id: row.id,
      code: row.template.code,
      name: row.template.name,
      version: row.version,
      status: row.status,
      questions: row.questions,
      updatedAt: row.updatedAt.toISOString(),
    })) };
  }

  @Get('admin/email-templates')
  @RequirePermission('catalog.configure')
  async emailTemplates() {
    const rows = await this.prisma.interviewQuestionTemplateVersion.findMany({
      include: { template: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return { items: rows.map((row) => {
      const payload: Record<string, unknown> = Array.isArray(row.questions) && isRecord(row.questions[0]) ? row.questions[0] : {};
      return {
        id: row.id,
        code: row.template.code,
        name: row.template.name,
        version: row.version,
        status: row.status,
        subject: typeof payload.subject === 'string' ? payload.subject : '',
        body: typeof payload.body === 'string' ? payload.body : '',
        variables: Array.isArray(payload.variables) ? payload.variables.filter((value): value is string => typeof value === 'string') : [],
        updatedAt: row.updatedAt.toISOString(),
      };
    }) };
  }

  @Get('admin/teams')
  @RequirePermission('iam.configure')
  async teams() {
    const rows = await this.prisma.team.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { users: true, candidates: true, clients: true, jobOrders: true } } },
    });
    return { items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      version: row.version,
      memberCount: row._count.users,
      candidateCount: row._count.candidates,
      clientCount: row._count.clients,
      orderCount: row._count.jobOrders,
      updatedAt: row.updatedAt.toISOString(),
    })) };
  }

  private async listActiveCatalog(type: CatalogCompatibilityType) {
    const items = await this.catalogs.list(type);
    const active = latestByCode(items.filter((item) => item.status === 'ACTIVE'));
    return { items: active.map((item) => this.catalogItem(item)) };
  }

  private async listAdminCatalog(type: CatalogCompatibilityType, status?: string) {
    const items = await this.catalogs.list(type);
    const filtered = status?.trim() ? items.filter((item) => item.status === status.trim().toUpperCase()) : items;
    return { items: filtered.map((item) => this.catalogItem(item)) };
  }

  private catalogItem(item: Awaited<ReturnType<CatalogService['list']>>[number]) {
    return {
      id: item.id,
      code: item.code,
      label: item.labelVi,
      version: item.version,
      status: item.status,
      usageCount: item.usageCount,
      payload: item.payload,
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

function latestByCode<T extends { code: string; version: number }>(items: T[]): T[] {
  const latest = new Map<string, T>();
  for (const item of items) {
    const current = latest.get(item.code);
    if (!current || item.version > current.version) latest.set(item.code, item);
  }
  return [...latest.values()].sort((left, right) => left.code.localeCompare(right.code));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
