'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';

const links = [
  ['/admin/users', 'admin.nav.users'], ['/admin/catalogs', 'admin.nav.catalogs'], ['/admin/templates', 'admin.nav.templates'], ['/admin/mailbox', 'admin.nav.mailbox'], ['/admin/audit', 'admin.nav.audit']
] as const;

export function AdminNav() {
  const { t } = useI18n();
  const pathname = usePathname() ?? '';
  return <nav className="flex flex-wrap gap-2" aria-label={t('admin.nav.aria')}>{links.map(([href, key]) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href as Route} aria-current={isActive ? 'page' : undefined} className={cn('rounded-control border border-border bg-panel px-3 py-2 text-sm font-semibold text-text-muted transition-[background-color,border-color,color] duration-150 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2', isActive && 'border-accent bg-[#e8f1fb] text-accent')}>{t(key)}</Link>;
  })}</nav>;
}
