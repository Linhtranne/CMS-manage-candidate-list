import { TemplatesPage } from '@/features/admin/components/templates-page';
import { AdminPermissionGate } from '@/features/admin/components/admin-permission-gate';

export default function AdminTemplatesPage() {
  return <AdminPermissionGate capability="catalog.configure"><TemplatesPage /></AdminPermissionGate>;
}
