import Link from 'next/link';
import type { Route } from 'next';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import type { CurrentUser } from '@/lib/auth/types';
import { can } from '@/lib/permissions/permissions';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './global-search';
import { NotificationMenu } from './notification-menu';
import { LanguageSwitcher } from './language-switcher';
import { useI18n } from '@/i18n/use-i18n';

export function Topbar({ user }: { user: CurrentUser }) {
  const { t } = useI18n();
  const pathname = usePathname() ?? '';
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      const response = await apiClient.POST('/auth/logout');
      if (response.error) {
        setLogoutError(t('auth.sessionUnavailable'));
        setLoggingOut(false);
        return;
      }
    } catch {
      setLogoutError(t('auth.sessionUnavailable'));
      setLoggingOut(false);
      return;
    }
    window.location.assign('/login');
  };

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-border bg-panel px-4 md:gap-4 md:px-6">
      <div className="min-w-0 flex-1"><GlobalSearch user={user} /></div>
      {can(user.permissions, 'admin.read') ? <Link href={'/admin' as Route} aria-current={pathname === '/admin' || pathname.startsWith('/admin/') ? 'page' : undefined} className={cn('hidden rounded-control px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface hover:text-text md:inline-flex', (pathname === '/admin' || pathname.startsWith('/admin/')) && 'bg-[#e8f1fb] text-accent')}>{t('navigation.admin')}</Link> : null}
      <LanguageSwitcher compact />
      <NotificationMenu />
      <div className="hidden text-right md:block">
        <p className="text-sm font-semibold text-text">{user.displayName}</p>
        <p className="text-xs text-text-muted">{t('common.user.internalStaff')}</p>
      </div>
      {logoutError ? <p role="alert" className="max-w-56 text-xs font-semibold text-danger">{logoutError}</p> : null}
      <button type="button" aria-label={t('common.actions.logout')} title={t('common.actions.logout')} disabled={loggingOut} onClick={() => void logout()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border bg-panel text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"><LogOut aria-hidden="true" size={18} strokeWidth={1.8} /></button>
    </header>
  );
}
