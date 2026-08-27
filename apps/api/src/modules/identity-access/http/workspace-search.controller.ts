import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { PolicyService } from '../application/policy.service.js';
import { PolicyGuard } from './guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from './guards/session.guard.js';

type SearchResult = {
  id: string;
  type: 'candidate' | 'client' | 'order';
  typeLabel: string;
  primaryText: string;
  secondaryText?: string;
  href: string;
};

@Controller()
@UseGuards(SessionGuard, PolicyGuard)
export class WorkspaceSearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  @Get('search')
  async search(@Query('q') query: string | undefined, @Req() request: AuthenticatedRequest) {
    const q = query?.trim();
    if (!q || q.length < 2) {
      throw Object.assign(new Error('SEARCH_QUERY_TOO_SHORT'), {
        code: 'SEARCH_QUERY_TOO_SHORT',
        statusCode: 422,
      });
    }

    const actor = {
      userId: request.auth!.userId,
      status: request.auth!.user.status as 'ACTIVE',
      teamId: request.auth!.teamId,
      roles: request.auth!.roles,
    };
    const pattern = q.slice(0, 120);
    const [candidates, clients, orders] = await Promise.all([
      this.searchCandidates(pattern, actor),
      this.searchClients(pattern, actor),
      this.searchOrders(pattern, actor),
    ]);

    const items = [...candidates, ...clients, ...orders].slice(0, 20);
    return {
      data: { items },
      page: { hasMore: false, nextCursor: null },
      requestId: getRequestContext()?.requestId ?? 'unknown-request',
    };
  }

  private async searchCandidates(pattern: string, actor: Parameters<PolicyService['scopeFilter']>[0]): Promise<SearchResult[]> {
    const scope = this.policy.scopeFilter(actor, 'candidate.view');
    if (this.isDenied(scope)) return [];
    const rows = await this.prisma.candidate.findMany({
      where: {
        AND: [scope, { OR: [{ code: { contains: pattern, mode: 'insensitive' } }, { name: { contains: pattern, mode: 'insensitive' } }, { occupation: { contains: pattern, mode: 'insensitive' } }] }],
      } as never,
      select: { id: true, code: true, name: true, occupation: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 8,
    });
    return rows.map((row) => ({
      id: row.id,
      type: 'candidate',
      typeLabel: 'Ứng viên',
      primaryText: row.name,
      secondaryText: `${row.code} · ${row.occupation}`,
      href: `/candidates/${row.id}`,
    }));
  }

  private async searchClients(pattern: string, actor: Parameters<PolicyService['scopeFilter']>[0]): Promise<SearchResult[]> {
    const scope = this.policy.scopeFilter(actor, 'client.view');
    if (this.isDenied(scope)) return [];
    const rows = await this.prisma.client.findMany({
      where: {
        AND: [scope, { OR: [{ code: { contains: pattern, mode: 'insensitive' } }, { name: { contains: pattern, mode: 'insensitive' } }, { region: { contains: pattern, mode: 'insensitive' } }] }],
      } as never,
      select: { id: true, code: true, name: true, region: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 8,
    });
    return rows.map((row) => ({
      id: row.id,
      type: 'client',
      typeLabel: 'Khách hàng',
      primaryText: row.name,
      secondaryText: `${row.code} · ${row.region}`,
      href: `/clients/${row.id}`,
    }));
  }

  private async searchOrders(pattern: string, actor: Parameters<PolicyService['scopeFilter']>[0]): Promise<SearchResult[]> {
    const scope = this.policy.scopeFilter(actor, 'job_order.view');
    if (this.isDenied(scope)) return [];
    const rows = await this.prisma.jobOrder.findMany({
      where: {
        AND: [scope, { OR: [{ code: { contains: pattern, mode: 'insensitive' } }, { position: { contains: pattern, mode: 'insensitive' } }, { occupation: { contains: pattern, mode: 'insensitive' } }, { location: { contains: pattern, mode: 'insensitive' } }] }],
      } as never,
      select: { id: true, code: true, position: true, client: { select: { name: true } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 8,
    });
    return rows.map((row) => ({
      id: row.id,
      type: 'order',
      typeLabel: 'Đơn tuyển',
      primaryText: row.position,
      secondaryText: `${row.code} · ${row.client.name}`,
      href: `/orders/${row.id}`,
    }));
  }

  private isDenied(scope: Record<string, unknown>): boolean {
    return scope.id === '__DENY_ALL__';
  }
}
