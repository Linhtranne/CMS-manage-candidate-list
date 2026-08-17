'use client';

import { useEffect, useRef } from 'react';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';

export function DetailDrawer({ open, title, onClose, size = 'default', children }: { open: boolean; title: string; onClose: () => void; size?: 'default' | 'wide'; children: React.ReactNode }) {
  const panelRef = useRef<HTMLElement>(null);
  const { mounted, closing, finishExit } = usePresence(open);
  useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);
  if (!mounted) return null;

  return (
    <div data-state={closing ? 'closing' : 'open'} data-size={size} onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishExit(); }} className="cms-drawer-layer fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng lớp chi tiết" className="cms-drawer-backdrop absolute inset-0 bg-[#182233]/35" onClick={onClose} />
      <aside ref={panelRef} tabIndex={-1} className={cn('cms-drawer-panel relative z-10 h-full w-full overflow-y-auto border-l border-border bg-panel p-6 shadow-panel focus:outline-none', size === 'wide' ? 'max-w-full md:max-w-[min(86vw,72rem)]' : 'max-w-xl')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text">{title}</h2>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}
