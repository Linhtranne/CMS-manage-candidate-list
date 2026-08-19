'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CmsShell } from '@/components/layout/cms-shell';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { adminNavigation, navigation } from '@/constants/navigation';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { can } from '@/lib/permissions/permissions';
import { useI18n } from '@/i18n/use-i18n';

function AccessDeniedState() {
  const { t } = useI18n();
  return <section className="mx-auto max-w-xl rounded-xl border border-border bg-panel p-8 text-center shadow-panel"><h1 className="text-2xl font-bold text-text">{t('auth.forbidden.title')}</h1><p className="mt-3 text-sm text-text-muted">{t('auth.forbidden.description')}</p><Link href="/work" className="mt-6 inline-flex min-h-10 items-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t('auth.forbidden.backToWork')}</Link></section>;
}

export function AuthenticatedCms({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { data: user, error, isPending, refetch } = useCurrentUser();

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center p-6"><LoadingState label={t('auth.checkingSession')} /></main>;
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorState onRetry={() => void refetch()} message={t('auth.sessionUnavailable')} />
          <div className="text-center"><Link className="text-sm font-semibold text-accent underline" href="/login">{t('auth.sessionExpired.loginAgain')}</Link></div>
        </div>
      </main>
    );
  }

  const requiredPermission = (pathname === adminNavigation.href || pathname.startsWith(`${adminNavigation.href}/`))
    ? adminNavigation.permission
    : navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.permission;

  return <CmsShell user={user}>{requiredPermission && !can(user.permissions, requiredPermission) ? <AccessDeniedState /> : children}</CmsShell>;
}
