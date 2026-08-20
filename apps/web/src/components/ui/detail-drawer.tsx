'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';
import { usePresence } from '@/hooks/use-presence';
import { isTopmostModalLayer } from '@/hooks/use-modal-stack';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';

export function DetailDrawer({ open, title, onClose, size = 'default', children }: { open: boolean; title: string; onClose: () => void; size?: 'default' | 'wide'; children: React.ReactNode }) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const { mounted, closing, finishExit } = usePresence(open);
  useDialogFocus(mounted, panelRef);
  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mounted]);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTopmostModalLayer(layerRef.current)) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);
  if (!mounted) return null;

  return (
    <div ref={layerRef} data-modal-layer="drawer" data-state={closing ? 'closing' : 'open'} data-size={size} onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishExit(); }} className="cms-drawer-layer fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="cms-drawer-backdrop absolute inset-0 bg-[#182233]/35" onClick={onClose} />
      <aside ref={panelRef} tabIndex={-1} className={cn('cms-drawer-panel relative z-10 h-full w-full overflow-y-auto overscroll-contain border-l border-border bg-panel p-6 shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40', size === 'wide' ? 'max-w-full md:max-w-[min(86vw,72rem)]' : 'max-w-xl')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <button type="button" aria-label={t('common.dialog.closeLabel', { title })} title={t('common.actions.close')} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onClose}>
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}
