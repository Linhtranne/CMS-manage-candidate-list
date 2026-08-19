import type { ReactNode } from 'react';

export function SavedViewBar({ children }: { children: ReactNode }) {
  return <div className="cms-saved-view-bar flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel p-3">{children}</div>;
}
