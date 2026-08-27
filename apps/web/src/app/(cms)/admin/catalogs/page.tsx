import { CatalogsPage } from '@/features/admin/components/catalogs-page';
import { AdminPermissionGate } from '@/features/admin/components/admin-permission-gate';

export default function AdminCatalogsPage() {
  return <AdminPermissionGate capability="catalog.configure"><CatalogsPage /></AdminPermissionGate>;
}
