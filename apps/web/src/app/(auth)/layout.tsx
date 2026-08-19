import type { ReactNode } from 'react';
import { MswProvider } from '@/components/auth/msw-provider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}
