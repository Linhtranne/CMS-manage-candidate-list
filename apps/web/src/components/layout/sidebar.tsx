'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { navigation, adminNavigation } from '@/constants/navigation';
import type { CurrentUser } from '@/lib/auth/types';
import { can } from '@/lib/permissions/permissions';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';

export function Sidebar({ user, open = true, mobile = false, onClose }: { user: CurrentUser; open?: boolean; mobile?: boolean; onClose?: () => void }) {
  const { t } = useI18n();
  if (!open) return null;
  const pathname = usePathname() ?? '';
  const items = navigation.filter((item) => can(user.permissions, item.permission));

  return (
    <aside className={cn(mobile ? 'cms-sidebar-mobile h-full min-h-0 w-full' : 'min-h-screen w-64', 'shrink-0 overflow-y-auto border-r border-border bg-panel')} aria-label={t('navigation.ariaLabel')}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Candidate Supply</p>
          <p className="mt-1 text-sm text-text-muted">{t('navigation.internalCms')}</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link
            key={item.href}
            href={item.href as Route}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => { if (mobile) onClose?.(); }}
            className={cn(
              'block rounded-control px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text',
              isActive && 'bg-[#e8f1fb] text-accent'
            )}
          >
            {t(item.labelKey)}
          </Link>;
        })}
        {can(user.permissions, adminNavigation.permission) ? (
          <Link href={adminNavigation.href as Route} aria-current={pathname === adminNavigation.href || pathname.startsWith(`${adminNavigation.href}/`) ? 'page' : undefined} onClick={() => { if (mobile) onClose?.(); }} className={cn(
            'block rounded-control px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text',
            (pathname === adminNavigation.href || pathname.startsWith(`${adminNavigation.href}/`)) && 'bg-[#e8f1fb] text-accent'
          )}>
            {t(adminNavigation.labelKey)}
          </Link>
        ) : null}
      </nav>
    </aside>
  );
}
