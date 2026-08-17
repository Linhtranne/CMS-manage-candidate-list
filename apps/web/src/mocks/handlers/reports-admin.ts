import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { adminAuditFixture, adminCatalogsFixture, adminMailboxFixture, adminRolesFixture, adminTemplatesFixture, adminUsersFixture } from '../fixtures/admin';
import { reportExportJobs, reportFunnelFixture, reportSummaryFixture } from '../fixtures/reports';

type ReportFilters = components['schemas']['ReportFilters'];
type CreateReportExportRequest = components['schemas']['CreateReportExportRequest'];
type AdminUserUpdate = components['schemas']['AdminUserUpdate'];
type AdminRoleUpdate = components['schemas']['AdminRoleUpdate'];
type VersionedActionRequest = components['schemas']['VersionedActionRequest'];

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

export const reportsAdminHandlers = [
  http.get('*/api/v1/reports/summary', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ ...reportSummaryFixture, filters: filtersFrom(url) });
  }),
  http.get('*/api/v1/reports/funnel', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ ...reportFunnelFixture, timeZone: filtersFrom(url).timeZone });
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
      status: body.reportKey === 'demo-completed' ? 'COMPLETED' : 'QUEUED',
      progress: body.reportKey === 'demo-completed' ? 100 : 0,
      downloadUrl: body.reportKey === 'demo-completed' ? `/api/v1/reports/exports/${id}/download` : null,
      expiresAt: body.reportKey === 'demo-completed' ? new Date(Date.now() + 86_400_000).toISOString() : null,
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
  http.get('*/api/v1/admin/users', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const items = adminUsersFixture.filter((user) => (!query || `${user.displayName} ${user.email} ${user.team.name}`.toLowerCase().includes(query)) && (!status || user.status === status));
    return HttpResponse.json({ items });
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
  http.get('*/api/v1/admin/audit', ({ request }) => {
    const url = new URL(request.url);
    const actorId = url.searchParams.get('actorId');
    const resourceId = url.searchParams.get('resourceId');
    const action = url.searchParams.get('action');
    const items = adminAuditFixture.filter((item) => (!actorId || item.actor.id === actorId) && (!resourceId || item.resourceId === resourceId) && (!action || item.action === action));
    return HttpResponse.json({ items, nextCursor: null });
  })
];
