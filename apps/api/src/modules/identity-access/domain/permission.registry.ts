export const PERMISSION_ACTIONS = [
  'candidate.view', 'candidate.create', 'candidate.update_basic', 'candidate.view_sensitive', 'candidate.merge', 'candidate.archive',
  'client.view', 'client.create', 'client.update',
  'job_order.view', 'job_order.create', 'job_order.update', 'job_order.transition',
  'application.view', 'application.create', 'application.update', 'application.decide',
  'interview.schedule', 'interview.record_result',
  'supply_journey.view', 'supply_journey.create', 'supply_journey.update_milestone', 'supply_journey.waive_milestone', 'supply_journey.complete',
  'email.read', 'email.send', 'email.manual_link', 'email.retry',
  'document.upload', 'document.download', 'document.download_sensitive',
  'task.view', 'task.update', 'task.assign', 'report.view', 'export.create',
  'catalog.configure', 'iam.configure', 'audit.view', 'break_glass.activate',
  'saved_view.view', 'saved_view.manage',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type ScopeLevel = 'SELF' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'COMPANY';
export type Sensitivity = 'NORMAL' | 'PERSONAL' | 'HIGHLY_SENSITIVE';

export interface ActorRole {
  code: string;
  scope?: ScopeLevel;
}

export interface ActorContext {
  userId: string;
  status?: 'ACTIVE' | 'LOCKED' | 'DISABLED' | 'INVITED';
  teamId?: string;
  departmentId?: string;
  roles: readonly ActorRole[];
}

export interface ScopeAttributes {
  ownerUserId?: string;
  teamId?: string;
  departmentId?: string;
}

export interface AuthorizationInput {
  actor: ActorContext;
  action: PermissionAction;
  resource?: ScopeAttributes;
  sensitivity: Sensitivity;
  reason?: string;
  approvalId?: string;
}

export const ROLE_ACTION_SCOPES: Record<string, Partial<Record<PermissionAction, ScopeLevel>>> = {
  RECRUITER: {
    'candidate.view': 'TEAM', 'candidate.create': 'TEAM', 'candidate.update_basic': 'TEAM', 'candidate.view_sensitive': 'ASSIGNED',
    'client.view': 'TEAM', 'job_order.view': 'TEAM', 'application.view': 'TEAM', 'application.create': 'TEAM', 'application.update': 'TEAM',
    'interview.schedule': 'TEAM', 'interview.record_result': 'TEAM', 'supply_journey.view': 'ASSIGNED',
    'email.read': 'ASSIGNED', 'email.send': 'ASSIGNED', 'document.upload': 'ASSIGNED', 'document.download': 'ASSIGNED',
    'task.view': 'TEAM', 'task.update': 'SELF', 'report.view': 'TEAM',
    'saved_view.view': 'TEAM', 'saved_view.manage': 'TEAM',
  },
  BUSINESS: {
    'candidate.view': 'DEPARTMENT', 'candidate.create': 'DEPARTMENT', 'candidate.update_basic': 'DEPARTMENT', 'candidate.view_sensitive': 'ASSIGNED',
    'client.view': 'DEPARTMENT', 'client.create': 'DEPARTMENT', 'client.update': 'DEPARTMENT',
    'job_order.view': 'DEPARTMENT', 'job_order.create': 'DEPARTMENT', 'job_order.update': 'DEPARTMENT', 'job_order.transition': 'DEPARTMENT',
    'application.view': 'DEPARTMENT', 'application.create': 'DEPARTMENT', 'application.update': 'DEPARTMENT', 'interview.schedule': 'DEPARTMENT',
    'supply_journey.view': 'DEPARTMENT', 'email.read': 'DEPARTMENT', 'email.send': 'DEPARTMENT', 'document.download': 'ASSIGNED',
    'task.view': 'DEPARTMENT', 'task.update': 'SELF', 'report.view': 'DEPARTMENT',
    'saved_view.view': 'DEPARTMENT', 'saved_view.manage': 'DEPARTMENT',
  },
  JAPAN_COORDINATOR: {
    'candidate.view': 'ASSIGNED', 'candidate.update_basic': 'ASSIGNED', 'candidate.view_sensitive': 'ASSIGNED',
    'job_order.view': 'ASSIGNED', 'application.view': 'ASSIGNED', 'application.update': 'ASSIGNED',
    'interview.schedule': 'ASSIGNED', 'interview.record_result': 'ASSIGNED', 'supply_journey.view': 'ASSIGNED',
    'supply_journey.create': 'ASSIGNED', 'supply_journey.update_milestone': 'ASSIGNED', 'email.read': 'ASSIGNED', 'email.send': 'ASSIGNED',
    'document.upload': 'ASSIGNED', 'document.download': 'ASSIGNED', 'task.view': 'ASSIGNED', 'task.update': 'SELF',
    'saved_view.view': 'ASSIGNED', 'saved_view.manage': 'ASSIGNED',
  },
  MANAGER: {
    'candidate.view': 'DEPARTMENT', 'candidate.create': 'DEPARTMENT', 'candidate.update_basic': 'DEPARTMENT', 'candidate.view_sensitive': 'DEPARTMENT',
    'candidate.merge': 'DEPARTMENT', 'candidate.archive': 'DEPARTMENT', 'client.view': 'DEPARTMENT', 'client.create': 'DEPARTMENT', 'client.update': 'DEPARTMENT',
    'job_order.view': 'DEPARTMENT', 'job_order.create': 'DEPARTMENT', 'job_order.update': 'DEPARTMENT', 'job_order.transition': 'DEPARTMENT',
    'application.view': 'DEPARTMENT', 'application.create': 'DEPARTMENT', 'application.update': 'DEPARTMENT', 'application.decide': 'DEPARTMENT',
    'interview.schedule': 'DEPARTMENT', 'interview.record_result': 'DEPARTMENT', 'supply_journey.view': 'DEPARTMENT', 'supply_journey.create': 'DEPARTMENT',
    'supply_journey.update_milestone': 'DEPARTMENT', 'supply_journey.waive_milestone': 'DEPARTMENT', 'supply_journey.complete': 'DEPARTMENT',
    'email.read': 'DEPARTMENT', 'email.send': 'DEPARTMENT', 'email.manual_link': 'DEPARTMENT', 'email.retry': 'DEPARTMENT',
    'document.upload': 'DEPARTMENT', 'document.download': 'DEPARTMENT', 'document.download_sensitive': 'DEPARTMENT',
    'task.view': 'DEPARTMENT', 'task.update': 'DEPARTMENT', 'task.assign': 'DEPARTMENT', 'report.view': 'DEPARTMENT', 'export.create': 'DEPARTMENT',
    'audit.view': 'DEPARTMENT',
    'saved_view.view': 'DEPARTMENT', 'saved_view.manage': 'DEPARTMENT',
  },
  CONFIG_ADMIN: { 'catalog.configure': 'COMPANY', 'iam.configure': 'COMPANY', 'audit.view': 'COMPANY', 'saved_view.view': 'COMPANY', 'saved_view.manage': 'COMPANY' },
};

export const REASON_REQUIRED_ACTIONS = new Set<PermissionAction>([
  'candidate.merge', 'candidate.archive', 'supply_journey.waive_milestone', 'supply_journey.complete', 'export.create', 'break_glass.activate',
]);

export const APPROVAL_REQUIRED_ACTIONS = new Set<PermissionAction>([
  'candidate.merge', 'candidate.archive', 'supply_journey.waive_milestone', 'supply_journey.complete', 'export.create', 'break_glass.activate',
]);
