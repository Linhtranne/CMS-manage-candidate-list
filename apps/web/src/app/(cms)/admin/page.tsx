'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useI18n } from '@/i18n/use-i18n';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { can } from '@/lib/permissions/permissions';

export default function AdminPage() {
  const { t } = useI18n();
  const { data: user } = useCurrentUser();
  const cards = [
    ['/admin/users', t('adminExtra.users.title'), 'iam.configure'],
    ['/admin/catalogs', t('admin.catalogs.title'), 'catalog.configure'],
    ['/admin/templates', t('adminExtra.templates.title'), 'catalog.configure'],
    ['/admin/mailbox', t('adminExtra.mailbox.title'), 'catalog.configure'],
    ['/admin/audit', t('admin.audit.title'), 'audit.view']
  ] as const;
  const visibleCards = cards.filter(([, , capability]) => user && can(user.permissions, capability));
  return <div className="space-y-8"><header><h1 className="text-2xl font-bold text-text">{t('admin.overview.title')}</h1></header><section aria-labelledby="admin-overview-sections"><div className="flex flex-wrap items-end justify-between gap-3"><h2 id="admin-overview-sections" className="text-lg font-bold text-text">{t('admin.overview.sections')}</h2><span className="text-sm font-semibold text-text-muted">{t('admin.overview.available', { count: visibleCards.length })}</span></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleCards.map(([href, title]) => <Link key={href} href={href as Route} className="group flex h-full flex-col justify-between gap-6 rounded-lg border border-border bg-panel p-5 transition-[border-color,box-shadow] hover:border-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"><h3 className="font-bold text-text group-hover:text-accent">{title}</h3><span className="text-sm font-semibold text-accent">{t('admin.overview.open')} <span aria-hidden="true">→</span></span></Link>)}</div></section></div>;
}
