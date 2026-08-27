import type { CurrentUser } from '@/lib/auth/types';

export const recruiterFixture: CurrentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  displayName: 'Nguyễn Minh Anh',
  email: 'minh.anh@company.vn',
  status: 'ACTIVE',
  roles: ['RECRUITER'],
  permissions: [
    'work.read',
    'clients.read',
    'orders.read',
    'candidates.read',
    'applications.read',
    'journeys.read',
    'mail.read',
    'reports.read',
    'candidate:read',
    'candidate:write',
    'candidate:email',
    'saved_view.manage'
  ]
};

export const coordinatorFixture: CurrentUser = {
  id: '22222222-2222-4222-8222-222222222222',
  displayName: 'Trần Quốc Huy',
  email: 'quoc.huy@company.vn',
  status: 'ACTIVE',
  roles: ['COORDINATOR'],
  permissions: ['work.read', 'clients.read', 'orders.read', 'candidates.read', 'applications.read', 'journeys.read', 'mail.read', 'candidate:read', 'candidate:write', 'flight:write']
};

export const managerFixture: CurrentUser = {
  id: '33333333-3333-4333-8333-333333333333',
  displayName: 'Lê Thu Hà',
  email: 'thu.ha@company.vn',
  status: 'ACTIVE',
  roles: ['MANAGER'],
  permissions: ['work.read', 'clients.read', 'orders.read', 'candidates.read', 'applications.read', 'journeys.read', 'journeys.waive', 'mail.read', 'reports.read', 'admin.read', 'candidate:read', 'candidate:approve', 'report:read', 'saved_view.manage']
};

export const configAdminFixture: CurrentUser = {
  id: '44444444-4444-4444-8444-444444444444',
  displayName: 'Phạm Đức Long',
  email: 'duc.long@company.vn',
  status: 'ACTIVE',
  roles: ['CONFIG_ADMIN'],
  permissions: ['iam.configure', 'catalog.configure', 'audit.view', 'saved_view.view', 'saved_view.manage']
};

export const auditorFixture: CurrentUser = {
  id: '55555555-5555-4555-8555-555555555555',
  displayName: 'Vũ Ngọc Mai',
  email: 'ngoc.mai@company.vn',
  status: 'ACTIVE',
  roles: ['AUDITOR'],
  permissions: ['candidates.read', 'audit.read', 'candidate:read', 'audit:read']
};
