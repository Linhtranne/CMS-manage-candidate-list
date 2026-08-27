import { AuditLogPage } from '@/features/admin/components/audit-log-page';
import { AdminPermissionGate } from '@/features/admin/components/admin-permission-gate';

export default function AdminAuditPage() {
  return <AdminPermissionGate capability="audit.view"><AuditLogPage /></AdminPermissionGate>;
}
