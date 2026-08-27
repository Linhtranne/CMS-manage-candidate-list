'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { can } from '@/lib/permissions/permissions';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';

type AdminCapability = 'iam.configure' | 'catalog.configure' | 'audit.view';

function AccessDeniedState() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-border bg-panel p-8 text-center shadow-panel">
      <h1 className="text-2xl font-bold text-text">{t('auth.forbidden.title')}</h1>
      <Link href="/admin" className="mt-6 inline-flex min-h-10 items-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-text">
        {t('admin.nav.aria')}
      </Link>
    </section>
  );
}

export function AdminPermissionGate({ capability, children }: { capability: AdminCapability; children: ReactNode }) {
  const { t } = useI18n();
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <LoadingState label={t('auth.checkingSession')} />;
  if (!user || !can(user.permissions, capability)) return <AccessDeniedState />;
  return <>{children}</>;
}
