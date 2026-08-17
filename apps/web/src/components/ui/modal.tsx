'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function Modal({ open, title, description, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const { mounted, closing, finishExit } = usePresence(open);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!mounted) return null;

  return (
    <div
      data-state={closing ? 'closing' : 'open'}
      className="cms-modal-layer fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finishExit();
      }}
    >
      <button type="button" aria-hidden="true" tabIndex={-1} className="cms-modal-backdrop absolute inset-0 bg-[#182233]/35" onClick={onClose} />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'cms-modal-panel relative z-10 max-h-[min(92vh,52rem)] w-full overflow-y-auto rounded-xl border border-border bg-panel shadow-panel focus:outline-none',
          size === 'sm' && 'max-w-lg',
          size === 'md' && 'max-w-2xl',
          size === 'lg' && 'max-w-4xl'
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
          </div>
          <button type="button" aria-label={`Đóng ${title}`} title="Đóng" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onClose}>
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</footer> : null}
      </section>
    </div>
  );
}
