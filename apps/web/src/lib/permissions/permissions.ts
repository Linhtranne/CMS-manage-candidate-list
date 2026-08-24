export type Permission =
  | 'work.read'
  | 'clients.read'
  | 'orders.read'
  | 'candidates.read'
  | 'applications.read'
  | 'journeys.read'
  | 'mail.read'
  | 'reports.read'
  | 'admin.read'
  | 'audit.read';

// The web shell uses stable route-level capability names while the API returns
// the canonical domain actions from the permission registry.
const API_PERMISSION_ALIASES: Record<Permission, readonly string[]> = {
  'work.read': ['task.view'],
  'clients.read': ['client.view'],
  'orders.read': ['job_order.view'],
  'candidates.read': ['candidate.view'],
  'applications.read': ['application.view'],
  'journeys.read': ['supply_journey.view'],
  'mail.read': ['email.read'],
  'reports.read': ['report.view'],
  'admin.read': ['iam.configure', 'catalog.configure', 'audit.view'],
  'audit.read': ['audit.view']
};

export function can(permissions: readonly string[], action: Permission | string) {
  return permissions.includes(action) || (action in API_PERMISSION_ALIASES && API_PERMISSION_ALIASES[action as Permission].some((alias) => permissions.includes(alias)));
}
