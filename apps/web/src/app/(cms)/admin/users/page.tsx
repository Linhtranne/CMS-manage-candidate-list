import { UsersPage } from '@/features/admin/components/users-page';
import { AdminPermissionGate } from '@/features/admin/components/admin-permission-gate';

export default function AdminUsersPage() {
  return <AdminPermissionGate capability="iam.configure"><UsersPage /></AdminPermissionGate>;
}
