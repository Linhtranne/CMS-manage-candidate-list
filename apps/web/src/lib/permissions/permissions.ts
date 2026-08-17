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

export function can(permissions: readonly string[], action: Permission | string) {
  return permissions.includes(action);
}
