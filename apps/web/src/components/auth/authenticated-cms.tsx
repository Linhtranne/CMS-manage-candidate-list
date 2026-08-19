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

function AccessDeniedState() {
  return <section className="mx-auto max-w-xl rounded-xl border border-border bg-panel p-8 text-center shadow-panel"><h1 className="text-2xl font-bold text-text">Bạn không có quyền truy cập</h1><p className="mt-3 text-sm text-text-muted">Nếu cần quyền bổ sung, hãy liên hệ quản trị hệ thống.</p><Link href="/work" className="mt-6 inline-flex min-h-10 items-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">Về việc của tôi</Link></section>;
}

export function AuthenticatedCms({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user, error, isPending, refetch } = useCurrentUser();

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center p-6"><LoadingState label="Đang kiểm tra phiên đăng nhập" /></main>;
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorState onRetry={() => void refetch()} message="Phiên làm việc không khả dụng. Vui lòng đăng nhập lại hoặc thử lại." />
          <div className="text-center"><Link className="text-sm font-semibold text-accent underline" href="/login">Đăng nhập lại</Link></div>
        </div>
      </main>
    );
  }

  const requiredPermission = (pathname === adminNavigation.href || pathname.startsWith(`${adminNavigation.href}/`))
    ? adminNavigation.permission
    : navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.permission;

  return <CmsShell user={user}>{requiredPermission && !can(user.permissions, requiredPermission) ? <AccessDeniedState /> : children}</CmsShell>;
}
