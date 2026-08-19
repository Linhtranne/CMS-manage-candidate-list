import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { adminAuditFixture, adminCatalogsFixture, adminMailboxFixture, adminRolesFixture, adminTemplatesFixture, adminUsersFixture } from '../fixtures/admin';
import { reportExportJobs, reportFunnelFixture, reportSummaryFixture } from '../fixtures/reports';

type ReportFilters = components['schemas']['ReportFilters'];
type CreateReportExportRequest = components['schemas']['CreateReportExportRequest'];
type AdminUserUpdate = components['schemas']['AdminUserUpdate'];
type CreateAdminUserRequest = components['schemas']['CreateAdminUserRequest'];
type AdminRoleUpdate = components['schemas']['AdminRoleUpdate'];
type VersionedActionRequest = components['schemas']['VersionedActionRequest'];
type CreateAdminCatalogRequest = components['schemas']['CreateAdminCatalogRequest'];
type CreateAdminTemplateRequest = components['schemas']['CreateAdminTemplateRequest'];
type MailboxSettingsUpdate = components['schemas']['MailboxSettingsUpdate'];

const problem = (code: string, message: string, status: number) => HttpResponse.json({ code, message, traceId: `mock-${code.toLowerCase()}` }, { status });
const actor = { id: 'u-manager', name: 'Lê Thu Hà' };

function filtersFrom(url: URL): ReportFilters {
  return {
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    teamId: url.searchParams.get('teamId'),
    ownerId: url.searchParams.get('ownerId'),
    clientId: url.searchParams.get('clientId'),
    orderId: url.searchParams.get('orderId'),
    industryId: url.searchParams.get('industryId'),
    sourceId: url.searchParams.get('sourceId'),
    timeZone: 'Asia/Ho_Chi_Minh'
  };
}

function filteredReport<T extends { value: number; unit?: string; numerator?: number; denominator?: number }>(items: T[], filters: ReportFilters) {
  const activeFilters = [filters.from, filters.to, filters.teamId, filters.ownerId, filters.clientId, filters.orderId, filters.industryId, filters.sourceId].filter(Boolean).length;
  const factor = Math.max(0.35, 1 - activeFilters * 0.08);
  return items.map((item) => item.numerator === undefined ? { ...item, value: item.unit === 'COUNT' ? Math.max(0, Math.round(item.value * factor)) : item.value } : { ...item, numerator: Math.max(0, Math.round(item.numerator * factor)), denominator: Math.max(1, Math.round((item.denominator ?? item.numerator) * factor)), value: item.value });
}

function filteredFunnel<T extends { numerator: number; denominator: number; rate: number }>(items: T[], filters: ReportFilters) {
  const activeFilters = [filters.from, filters.to, filters.teamId, filters.ownerId, filters.clientId, filters.orderId, filters.industryId, filters.sourceId].filter(Boolean).length;
  const factor = Math.max(0.35, 1 - activeFilters * 0.08);
  return items.map((item) => { const numerator = Math.max(0, Math.round(item.numerator * factor)); const denominator = Math.max(numerator, Math.round(item.denominator * factor)); return { ...item, numerator, denominator, rate: denominator ? numerator / denominator : 0 }; });
}

export const reportsAdminHandlers = [
  http.get('*/api/v1/reports/summary', ({ request }) => {
    const url = new URL(request.url);
    const filters = filtersFrom(url);
    return HttpResponse.json({ ...reportSummaryFixture, filters, metrics: filteredReport(reportSummaryFixture.metrics, filters), sourceQuality: filteredReport(reportSummaryFixture.sourceQuality, filters), clients: filteredReport(reportSummaryFixture.clients, filters), journeys: filteredReport(reportSummaryFixture.journeys, filters), mailbox: filteredReport(reportSummaryFixture.mailbox, filters), workload: filteredReport(reportSummaryFixture.workload, filters), dataQuality: filteredReport(reportSummaryFixture.dataQuality, filters) });
  }),
  http.get('*/api/v1/reports/funnel', ({ request }) => {
    const url = new URL(request.url);
    const filters = filtersFrom(url);
    return HttpResponse.json({ ...reportFunnelFixture, stages: filteredFunnel(reportFunnelFixture.stages, filters), timeZone: filters.timeZone });
  }),
  http.post('*/api/v1/reports/exports', async ({ request }) => {
    const body = (await request.json()) as CreateReportExportRequest;
    if (!body.reportKey || !body.format || !body.includedFields.length) return problem('VALIDATION_ERROR', 'Cần chọn báo cáo, định dạng và ít nhất một trường dữ liệu.', 422);
    const now = new Date().toISOString();
    const id = `export-${reportExportJobs.size + 1}`;
    const job: components['schemas']['ReportExportJob'] = {
      id,
      reportKey: body.reportKey,
      format: body.format,
      status: 'QUEUED',
      progress: 0,
      downloadUrl: null,
      expiresAt: null,
      error: null,
      createdAt: now,
      requestedBy: actor
    };
    reportExportJobs.set(id, job);
    return HttpResponse.json(job, { status: 202 });
  }),
  http.get('*/api/v1/reports/exports/:id', ({ params }) => {
    const job = reportExportJobs.get(String(params.id));
    return job ? HttpResponse.json(job) : problem('NOT_FOUND', 'Không tìm thấy yêu cầu xuất báo cáo.', 404);
  }),
  http.get('*/api/v1/reports/exports/:id/download', ({ params }) => {
    const job = reportExportJobs.get(String(params.id));
    if (!job || !job.downloadUrl) return problem('NOT_FOUND', 'Tệp xuất không còn khả dụng.', 404);
    const csv = 'metric,value,unit\napplications,60,COUNT\npassed,0.3,PERCENT\n';
    return new HttpResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${job.reportKey}.${job.format.toLowerCase()}"` } });
  }),
  http.get('*/api/v1/admin/users', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const items = adminUsersFixture.filter((user) => (!query || `${user.displayName} ${user.email} ${user.team.name}`.toLowerCase().includes(query)) && (!status || user.status === status));
    return HttpResponse.json({ items });
  }),
  http.post('*/api/v1/admin/users', async ({ request }) => {
    const body = (await request.json()) as CreateAdminUserRequest;
    if (adminUsersFixture.some((item) => item.email.toLowerCase() === body.email.toLowerCase())) return problem('CONFLICT', 'Email người dùng đã tồn tại.', 409);
    const teamNames: Record<string, string> = { 'team-recruiting': 'Tuyển dụng', 'team-coordination': 'Điều phối', 'team-platform': 'Vận hành hệ thống', 'team-compliance': 'Kiểm soát' };
    const user = {
      id: `u-invited-${adminUsersFixture.length + 1}`,
      displayName: body.displayName,
      email: body.email,
      team: { id: body.teamId, name: teamNames[body.teamId] ?? body.teamId },
      roleIds: body.roleIds,
      status: 'INVITED' as const,
      lastActiveAt: null,
      version: 1
    };
    adminUsersFixture.push(user);
    return HttpResponse.json(user, { status: 201 });
  }),
  http.patch('*/api/v1/admin/users/:id', async ({ params, request }) => {
    const user = adminUsersFixture.find((item) => item.id === String(params.id));
    if (!user) return problem('NOT_FOUND', 'Không tìm thấy người dùng nội bộ.', 404);
    const body = (await request.json()) as AdminUserUpdate;
    if (body.version !== user.version) return problem('VERSION_CONFLICT', 'Người dùng vừa được cập nhật, hãy tải lại.', 409);
    Object.assign(user, { roleIds: body.roleIds, status: body.status, team: { id: body.teamId, name: body.teamId === 'team-recruiting' ? 'Tuyển dụng' : 'Nhóm đã chọn' }, version: user.version + 1 });
    return HttpResponse.json(user);
  }),
  http.get('*/api/v1/admin/roles', () => HttpResponse.json({ items: adminRolesFixture })),
  http.patch('*/api/v1/admin/roles/:id', async ({ params, request }) => {
    const role = adminRolesFixture.find((item) => item.id === String(params.id));
    if (!role) return problem('NOT_FOUND', 'Không tìm thấy vai trò.', 404);
    const body = (await request.json()) as AdminRoleUpdate;
    if (body.version !== role.version) return problem('VERSION_CONFLICT', 'Vai trò vừa được cập nhật, hãy tải lại.', 409);
    Object.assign(role, { actions: body.actions, scopes: body.scopes, sensitivities: body.sensitivities, permissionRules: body.permissionRules, version: role.version + 1 });
    return HttpResponse.json(role);
  }),
  http.get('*/api/v1/admin/catalogs', ({ request }) => {
    const type = new URL(request.url).searchParams.get('type');
    return HttpResponse.json({ items: adminCatalogsFixture.filter((item) => !type || item.type === type) });
  }),
  http.post('*/api/v1/admin/catalogs', async ({ request }) => {
    const body = await request.json() as CreateAdminCatalogRequest;
    if (adminCatalogsFixture.some((item) => item.code === body.code)) return problem('CONFLICT', 'Mã danh mục đã tồn tại.', 409);
    const item = { id: `catalog-${adminCatalogsFixture.length + 1}`, type: body.type, code: body.code, label: body.label, version: 1, status: 'ACTIVE' as const, usageCount: 0 };
    adminCatalogsFixture.push(item);
    return HttpResponse.json(item, { status: 201 });
  }),
  http.post('*/api/v1/admin/catalogs/:id/retire', async ({ params, request }) => {
    const item = adminCatalogsFixture.find((candidate) => candidate.id === String(params.id));
    if (!item) return problem('NOT_FOUND', 'Không tìm thấy giá trị danh mục.', 404);
    const body = (await request.json()) as VersionedActionRequest;
    if (body.version !== item.version) return problem('VERSION_CONFLICT', 'Danh mục vừa được cập nhật, hãy tải lại.', 409);
    item.status = 'RETIRED';
    item.version += 1;
    return HttpResponse.json(item);
  }),
  http.get('*/api/v1/admin/templates', ({ request }) => {
    const type = new URL(request.url).searchParams.get('type');
    return HttpResponse.json({ items: adminTemplatesFixture.filter((item) => !type || item.type === type) });
  }),
  http.post('*/api/v1/admin/templates', async ({ request }) => {
    const body = await request.json() as CreateAdminTemplateRequest;
    const item = { id: `template-${adminTemplatesFixture.length + 1}`, type: body.type, name: body.name, version: 'v1', status: 'DRAFT' as const, usedByCount: 0, updatedAt: new Date().toISOString(), previewText: body.previewText, subject: body.subject ?? '', body: body.body ?? body.previewText, variables: body.variables ?? [], milestones: body.milestones ?? [] };
    adminTemplatesFixture.push(item);
    return HttpResponse.json(item, { status: 201 });
  }),
  http.post('*/api/v1/admin/templates/:id/retire', async ({ params, request }) => {
    const item = adminTemplatesFixture.find((candidate) => candidate.id === String(params.id));
    if (!item) return problem('NOT_FOUND', 'Không tìm thấy template.', 404);
    const body = (await request.json()) as VersionedActionRequest;
    const versionNumber = Number(item.version.replace('v', ''));
    if (body.version !== versionNumber) return problem('VERSION_CONFLICT', 'Template vừa được cập nhật, hãy tải lại.', 409);
    item.status = 'RETIRED';
    item.version = `v${versionNumber + 1}`;
    return HttpResponse.json(item);
  }),
  http.get('*/api/v1/admin/mailbox', () => HttpResponse.json(adminMailboxFixture)),
  http.patch('*/api/v1/admin/mailbox', async ({ request }) => {
    const body = await request.json() as MailboxSettingsUpdate;
    Object.assign(adminMailboxFixture, { senderName: body.senderName, adapter: body.adapter, maxAttachmentBytes: body.maxAttachmentBytes, signature: body.signature ?? adminMailboxFixture.signature, receiveFolder: body.receiveFolder ?? adminMailboxFixture.receiveFolder, sentFolder: body.sentFolder ?? adminMailboxFixture.sentFolder, retryLimit: body.retryLimit ?? adminMailboxFixture.retryLimit, alertAddress: body.alertAddress ?? adminMailboxFixture.alertAddress, lastCheckedAt: new Date().toISOString(), health: 'HEALTHY' as const });
    adminAuditFixture.unshift({ id: `audit-mailbox-${Date.now()}`, occurredAt: new Date().toISOString(), actor, action: 'MAILBOX_SETTINGS_UPDATED', resourceType: 'MAILBOX', resourceId: adminMailboxFixture.address, source: 'UI', summary: 'Cập nhật cấu hình hộp thư chung.', metadata: { adapter: body.adapter, maxAttachmentBytes: body.maxAttachmentBytes } });
    return HttpResponse.json(adminMailboxFixture);
  }),
  http.get('*/api/v1/admin/audit', ({ request }) => {
    const url = new URL(request.url);
    const actorId = url.searchParams.get('actorId');
    const resourceId = url.searchParams.get('resourceId');
    const action = url.searchParams.get('action');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = adminAuditFixture.filter((item) => { const occurred = item.occurredAt.slice(0, 10); return (!actorId || item.actor.id === actorId) && (!resourceId || item.resourceId === resourceId) && (!action || item.action === action) && (!from || occurred >= from) && (!to || occurred <= to); });
    return HttpResponse.json({ items, nextCursor: null });
  })
];
