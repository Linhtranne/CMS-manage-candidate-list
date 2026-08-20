'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { AdminNav } from '@/features/admin/components/admin-nav';
import { useI18n } from '@/i18n/use-i18n';

export default function AdminPage() {
  const { t } = useI18n();
  const cards = [
    ['/admin/users', t('adminExtra.users.title'), t('adminExtra.users.description')],
    ['/admin/catalogs', t('admin.nav.catalogs'), t('admin.catalogs.description')],
    ['/admin/templates', t('admin.nav.templates'), t('adminExtra.templates.description')],
    ['/admin/mailbox', t('adminExtra.mailbox.title'), t('adminExtra.mailbox.description')],
    ['/admin/audit', t('admin.audit.title'), t('admin.audit.description')]
  ] as const;
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">{t('admin.nav.aria')}</p><h1 className="mt-1 text-2xl font-bold text-text">{t('admin.nav.users')}</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">{t('admin.matrix.warning')}</p></div><AdminNav /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([href, title, description]) => <Link key={href} href={href as Route} className="rounded-lg border border-border bg-panel p-5 hover:border-accent"><h2 className="font-bold text-text">{title}</h2><p className="mt-2 text-sm text-text-muted">{description}</p></Link>)}</div></div>;
}
