import type { components } from '@cms/contracts';

const actor = { id: 'u-manager', name: 'Lê Thu Hà' };
const now = '2026-08-17T09:00:00+07:00';

export const adminUsersFixture: components['schemas']['AdminUser'][] = [
  { id: 'u-recruiter', displayName: 'Nguyễn Minh Anh', email: 'minh.anh@company.vn', team: { id: 'team-recruiting', name: 'Tuyển dụng' }, roleIds: ['recruiter'], status: 'ACTIVE', lastActiveAt: now, version: 3 },
  { id: 'u-coordinator', displayName: 'Trần Quốc Huy', email: 'quoc.huy@company.vn', team: { id: 'team-coordination', name: 'Điều phối' }, roleIds: ['coordinator'], status: 'ACTIVE', lastActiveAt: '2026-08-16T16:30:00+07:00', version: 2 },
  { id: 'u-manager', displayName: 'Lê Thu Hà', email: 'thu.ha@company.vn', team: { id: 'team-recruiting', name: 'Tuyển dụng' }, roleIds: ['manager'], status: 'ACTIVE', lastActiveAt: now, version: 5 },
  { id: 'u-config', displayName: 'Phạm Đức Long', email: 'duc.long@company.vn', team: { id: 'team-platform', name: 'Vận hành hệ thống' }, roleIds: ['config-admin'], status: 'ACTIVE', lastActiveAt: '2026-08-15T11:20:00+07:00', version: 1 },
  { id: 'u-auditor', displayName: 'Vũ Ngọc Mai', email: 'ngoc.mai@company.vn', team: { id: 'team-compliance', name: 'Kiểm soát' }, roleIds: ['auditor'], status: 'INVITED', lastActiveAt: null, version: 1 }
];

type AdminPermissionRule = components['schemas']['AdminPermissionRule'];
const permission = (action: string, scope: AdminPermissionRule['scope'], sensitivity: AdminPermissionRule['sensitivities'][number] = 'NORMAL', options: Pick<AdminPermissionRule, 'approvalRequired' | 'reasonRequired'> = { approvalRequired: false, reasonRequired: false }): AdminPermissionRule => ({ action, scope, sensitivities: [sensitivity], ...options });

export const adminRolesFixture: components['schemas']['AdminRole'][] = [
  {
    id: 'recruiter', name: 'Recruiter', description: 'Xử lý ứng viên, đơn tuyển và giao tiếp trong phạm vi đội.',
    actions: ['candidate.view', 'candidate.create_update_basic', 'candidate.view_sensitive', 'job_order.view', 'application.create_update', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'email.read', 'email.send', 'email.manual_link'],
    scopes: ['SELF', 'TEAM'], sensitivities: ['PERSONAL'], version: 2,
    permissionRules: [permission('candidate.view', 'TEAM'), permission('candidate.create_update_basic', 'TEAM'), permission('candidate.view_sensitive', 'SELF', 'PERSONAL'), permission('job_order.view', 'TEAM'), permission('application.create_update', 'TEAM'), permission('interview.schedule', 'TEAM'), permission('interview.record_result', 'SELF'), permission('supply_journey.view', 'SELF'), permission('email.read', 'TEAM', 'PERSONAL'), permission('email.send', 'TEAM', 'PERSONAL'), permission('email.manual_link', 'TEAM')]
  },
  {
    id: 'business', name: 'Business', description: 'Quản lý khách hàng, đơn tuyển và pipeline theo phòng ban.',
    actions: ['candidate.view', 'candidate.create_update_basic', 'candidate.view_sensitive', 'job_order.view', 'job_order.create_update', 'application.create_update', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'email.read', 'email.send', 'email.manual_link', 'report.view'],
    scopes: ['SELF', 'DEPARTMENT'], sensitivities: ['PERSONAL'], version: 1,
    permissionRules: [permission('candidate.view', 'DEPARTMENT'), permission('candidate.create_update_basic', 'DEPARTMENT'), permission('candidate.view_sensitive', 'SELF', 'PERSONAL'), permission('job_order.view', 'DEPARTMENT'), permission('job_order.create_update', 'DEPARTMENT'), permission('application.create_update', 'DEPARTMENT'), permission('interview.schedule', 'DEPARTMENT'), permission('interview.record_result', 'SELF'), permission('supply_journey.view', 'DEPARTMENT'), permission('email.read', 'DEPARTMENT', 'PERSONAL'), permission('email.send', 'DEPARTMENT', 'PERSONAL'), permission('email.manual_link', 'DEPARTMENT'), permission('report.view', 'DEPARTMENT')]
  },
  {
    id: 'coordinator', name: 'Japan Coordinator', description: 'Theo dõi hồ sơ và lộ trình cung ứng sau trúng tuyển.',
    actions: ['candidate.view', 'candidate.create_update_basic', 'candidate.view_sensitive', 'job_order.view', 'application.create_update', 'supply_journey.view', 'supply_journey.update_milestone', 'email.read', 'email.send', 'email.manual_link', 'document.download_sensitive'],
    scopes: ['SELF'], sensitivities: ['PERSONAL', 'HIGHLY_SENSITIVE'], version: 4,
    permissionRules: [permission('candidate.view', 'SELF'), permission('candidate.create_update_basic', 'SELF'), permission('candidate.view_sensitive', 'SELF', 'PERSONAL'), permission('job_order.view', 'SELF'), permission('application.create_update', 'SELF'), permission('supply_journey.view', 'SELF'), permission('supply_journey.update_milestone', 'SELF'), permission('email.read', 'SELF', 'PERSONAL'), permission('email.send', 'SELF', 'PERSONAL'), permission('email.manual_link', 'SELF'), permission('document.download_sensitive', 'SELF', 'HIGHLY_SENSITIVE')]
  },
  {
    id: 'manager', name: 'Manager', description: 'Xem báo cáo, phê duyệt và quản lý theo phạm vi phòng ban.',
    actions: ['candidate.view', 'candidate.create_update_basic', 'candidate.view_sensitive', 'candidate.merge', 'job_order.view', 'job_order.create_update', 'application.create_update', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'supply_journey.update_milestone', 'supply_journey.waive', 'email.read', 'email.send', 'email.manual_link', 'document.download_sensitive', 'export.candidate_data', 'report.view', 'report.export', 'audit.view'],
    scopes: ['DEPARTMENT'], sensitivities: ['PERSONAL', 'HIGHLY_SENSITIVE'], version: 3,
    permissionRules: [permission('candidate.view', 'DEPARTMENT'), permission('candidate.create_update_basic', 'DEPARTMENT'), permission('candidate.view_sensitive', 'DEPARTMENT', 'PERSONAL'), permission('candidate.merge', 'DEPARTMENT', 'PERSONAL', { approvalRequired: true, reasonRequired: true }), permission('job_order.view', 'DEPARTMENT'), permission('job_order.create_update', 'DEPARTMENT'), permission('application.create_update', 'DEPARTMENT'), permission('interview.schedule', 'DEPARTMENT'), permission('interview.record_result', 'DEPARTMENT'), permission('supply_journey.view', 'DEPARTMENT'), permission('supply_journey.update_milestone', 'DEPARTMENT'), permission('supply_journey.waive', 'DEPARTMENT', 'PERSONAL', { approvalRequired: true, reasonRequired: true }), permission('email.read', 'DEPARTMENT', 'PERSONAL'), permission('email.send', 'DEPARTMENT', 'PERSONAL'), permission('email.manual_link', 'DEPARTMENT'), permission('document.download_sensitive', 'DEPARTMENT', 'HIGHLY_SENSITIVE', { approvalRequired: true, reasonRequired: true }), permission('export.candidate_data', 'DEPARTMENT', 'HIGHLY_SENSITIVE', { approvalRequired: true, reasonRequired: true }), permission('report.view', 'DEPARTMENT'), permission('report.export', 'DEPARTMENT', 'PERSONAL', { approvalRequired: true, reasonRequired: true }), permission('audit.view', 'DEPARTMENT')]
  },
  {
    id: 'config-admin', name: 'Configuration admin', description: 'Quản lý cấu hình hệ thống, không mặc định đọc nội dung nghiệp vụ.',
    actions: ['catalog.manage', 'template.manage', 'mailbox.configure', 'user.manage', 'iam.configure'],
    scopes: ['ALL'], sensitivities: ['HIGHLY_SENSITIVE'], version: 1,
    permissionRules: [permission('catalog.manage', 'ALL'), permission('template.manage', 'ALL'), permission('mailbox.configure', 'ALL', 'HIGHLY_SENSITIVE', { approvalRequired: true, reasonRequired: true }), permission('user.manage', 'ALL'), permission('iam.configure', 'ALL')]
  },
  {
    id: 'auditor', name: 'Auditor', description: 'Chỉ đọc audit và dữ liệu đã được cấp quyền.',
    actions: ['audit.view'], scopes: ['ALL'], sensitivities: [], version: 1,
    permissionRules: [permission('audit.view', 'ALL')]
  }
];

export const adminCatalogsFixture: components['schemas']['AdminCatalogItem'][] = [
  { id: 'industry-it', type: 'INDUSTRY', code: 'IT', label: 'Công nghệ thông tin', version: 3, status: 'ACTIVE', usageCount: 18 },
  { id: 'industry-care', type: 'INDUSTRY', code: 'CARE', label: 'Chăm sóc sức khỏe', version: 2, status: 'ACTIVE', usageCount: 9 },
  { id: 'occupation-software', type: 'OCCUPATION', code: 'SOFTWARE_ENGINEER', label: 'Kỹ sư phần mềm', version: 4, status: 'ACTIVE', usageCount: 12 },
  { id: 'occupation-warehouse', type: 'OCCUPATION', code: 'WAREHOUSE', label: 'Kho vận', version: 1, status: 'ACTIVE', usageCount: 0 },
  { id: 'source-old', type: 'SOURCE', code: 'OLD_PARTNER', label: 'Đối tác cũ', version: 1, status: 'RETIRED', usageCount: 6 }
];

export const adminTemplatesFixture: components['schemas']['AdminTemplate'][] = [
  { id: 'journey-japan-new-hire', type: 'JOURNEY', name: 'Tuyển mới tại Việt Nam → Nhật Bản', version: 'v3', status: 'ACTIVE', usedByCount: 12, updatedAt: now, previewText: 'Nhận việc · Hồ sơ · COE · Visa · Chuẩn bị · Tiếp nhận', milestones: ['Xác nhận nhận việc', 'Bổ sung hồ sơ', 'COE', 'Visa', 'Chuẩn bị bay', 'Tiếp nhận'] },
  { id: 'journey-japan-transfer', type: 'JOURNEY', name: 'Chuyển việc trong Nhật Bản', version: 'v2', status: 'ACTIVE', usedByCount: 4, updatedAt: '2026-08-10T09:30:00+07:00', previewText: 'Hợp đồng mới · Đổi tư cách · Bàn giao · Tiếp nhận', milestones: ['Hợp đồng mới', 'Đổi tư cách', 'Bàn giao', 'Tiếp nhận'] },
  { id: 'email-interview-reminder', type: 'EMAIL', name: 'Nhắc lịch phỏng vấn', version: 'v5', status: 'ACTIVE', usedByCount: 38, updatedAt: '2026-08-12T14:00:00+07:00', previewText: 'Xác nhận lịch, múi giờ và hướng dẫn tham gia.', subject: 'Xác nhận lịch phỏng vấn {{candidate.name}}', body: 'Chào {{candidate.name}}, lịch phỏng vấn của bạn…', variables: ['candidate.name', 'interview.scheduledAt', 'order.position'] },
  { id: 'email-old-offer', type: 'EMAIL', name: 'Mẫu offer cũ', version: 'v1', status: 'RETIRED', usedByCount: 0, updatedAt: '2026-07-01T08:00:00+07:00', previewText: 'Mẫu đã ngừng sử dụng.', subject: 'Offer cũ', body: 'Mẫu đã ngừng sử dụng.', variables: [] }
];

export const adminMailboxFixture: components['schemas']['MailboxSettingsView'] = {
  address: 'ungvien@company.vn',
  senderName: 'Candidate Supply',
  adapter: 'MICROSOFT_365',
  maxAttachmentBytes: 10 * 1024 * 1024,
  health: 'HEALTHY',
  lastCheckedAt: now,
  credentialConfigured: true,
  signature: 'Trân trọng,\nCandidate Supply Team',
  receiveFolder: 'Inbox',
  sentFolder: 'Sent',
  retryLimit: 3,
  alertAddress: 'ops@company.vn'
};

export const adminAuditFixture: components['schemas']['AdminAuditEvent'][] = [
  { id: 'audit-001', occurredAt: '2026-08-17T08:40:00+07:00', actor, action: 'REPORT_EXPORT_REQUESTED', resourceType: 'REPORT', resourceId: 'applications', source: 'UI', summary: 'Yêu cầu xuất báo cáo đơn ứng tuyển.', metadata: { format: 'XLSX', fields: 8 } },
  { id: 'audit-002', occurredAt: '2026-08-16T16:12:00+07:00', actor: { id: 'u-config', name: 'Phạm Đức Long' }, action: 'TEMPLATE_RETIRED', resourceType: 'EMAIL_TEMPLATE', resourceId: 'email-old-offer', source: 'UI', summary: 'Ngừng sử dụng mẫu email cũ.', metadata: { version: 'v1' } },
  { id: 'audit-003', occurredAt: '2026-08-16T10:05:00+07:00', actor: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, action: 'EMAIL_SENT', resourceType: 'CONVERSATION', resourceId: 'conversation-001', source: 'EMAIL', summary: 'Xếp hàng gửi phản hồi ứng viên.', metadata: { status: 'QUEUED' } },
  { id: 'audit-004', occurredAt: '2026-08-15T15:30:00+07:00', actor: { id: 'u-manager', name: 'Lê Thu Hà' }, action: 'ROLE_UPDATED', resourceType: 'ROLE', resourceId: 'manager', source: 'UI', summary: 'Cập nhật phạm vi báo cáo cho Manager.', metadata: { version: 3 } }
];
