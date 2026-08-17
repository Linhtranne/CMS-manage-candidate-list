'use client';

import { Bell } from 'lucide-react';

export function NotificationMenu() {
  return (
    <button type="button" className="inline-flex min-h-10 w-10 items-center justify-center rounded-control border border-border bg-panel text-text-muted transition-colors hover:bg-surface hover:text-text" aria-label="Thông báo" title="Thông báo">
      <Bell size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
