import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SavedViewBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('cms-saved-view-bar flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel p-3', className)}>{children}</div>;
}
