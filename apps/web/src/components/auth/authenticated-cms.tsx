'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CmsShell } from '@/components/layout/cms-shell';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useCurrentUser } from '@/lib/auth/use-current-user';

export function AuthenticatedCms({ children }: { children: ReactNode }) {
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

  return <CmsShell user={user}>{children}</CmsShell>;
}
