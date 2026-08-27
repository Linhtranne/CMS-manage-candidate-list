'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';
import { can } from '@/lib/permissions/permissions';

const links = [
  ['/admin/users', 'admin.nav.users', 'iam.configure'],
  ['/admin/catalogs', 'admin.nav.catalogs', 'catalog.configure'],
  ['/admin/templates', 'admin.nav.templates', 'catalog.configure'],
  ['/admin/mailbox', 'admin.nav.mailbox', 'catalog.configure'],
  ['/admin/audit', 'admin.nav.audit', 'audit.view']
] as const;

export function AdminNav({ permissions }: { permissions?: readonly string[] }) {
  const { t } = useI18n();
  const pathname = usePathname() ?? '';
  return <nav
    className="flex max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1"
    aria-label={t('admin.nav.aria')}
    onWheel={(event) => {
      const { currentTarget } = event;
      if (currentTarget.scrollWidth <= currentTarget.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const maxScrollLeft = currentTarget.scrollWidth - currentTarget.clientWidth;
      const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, currentTarget.scrollLeft + event.deltaY));
      if (nextScrollLeft === currentTarget.scrollLeft) return;

      event.preventDefault();
      currentTarget.scrollLeft = nextScrollLeft;
    }}
  >{links.map(([href, key, capability]) => {
      if (permissions && !can(permissions, capability)) return null;
      const isActive = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href as Route} aria-current={isActive ? 'page' : undefined} className={cn('shrink-0 rounded-control border border-border bg-panel px-3 py-2 text-sm font-semibold text-text-muted transition-[background-color,border-color,color] duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2', isActive && 'border-accent bg-[#e8f1fb] text-accent')}>{t(key)}</Link>;
    })}</nav>;
}
