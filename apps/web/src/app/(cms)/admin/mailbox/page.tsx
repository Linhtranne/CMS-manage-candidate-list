import { MailboxSettingsPage } from '@/features/admin/components/mailbox-settings-page';
import { AdminPermissionGate } from '@/features/admin/components/admin-permission-gate';

export default function AdminMailboxPage() {
  return <AdminPermissionGate capability="catalog.configure"><MailboxSettingsPage /></AdminPermissionGate>;
}
