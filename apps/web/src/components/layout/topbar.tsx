import type { CurrentUser } from '@/lib/auth/types';
import { GlobalSearch } from './global-search';
import { NotificationMenu } from './notification-menu';

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-border bg-panel px-4 md:px-6">
      <div className="min-w-0 flex-1"><GlobalSearch user={user} /></div>
      <NotificationMenu />
      <div className="hidden text-right md:block">
        <p className="text-sm font-semibold text-text">{user.displayName}</p>
        <p className="text-xs text-text-muted">Nhân viên nội bộ</p>
      </div>
    </header>
  );
}
