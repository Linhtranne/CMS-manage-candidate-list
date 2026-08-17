import type { ReactNode } from 'react';
import type { Permission } from './permissions';
import { can } from './permissions';

export function PermissionGate({
  permissions,
  permission,
  fallback = null,
  children
}: {
  permissions: readonly string[];
  permission: Permission | string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return can(permissions, permission) ? children : fallback;
}
