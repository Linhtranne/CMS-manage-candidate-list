import type { ReactNode } from 'react';
import { AuthenticatedCms } from '@/components/auth/authenticated-cms';
import { MswProvider } from '@/components/auth/msw-provider';
import { QueryProvider } from '@/providers/query-provider';

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <MswProvider>
        <AuthenticatedCms>{children}</AuthenticatedCms>
      </MswProvider>
    </QueryProvider>
  );
}
