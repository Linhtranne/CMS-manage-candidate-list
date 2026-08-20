'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';
import { usePresence } from '@/hooks/use-presence';
import { isTopmostModalLayer, useModalIsolation } from '@/hooks/use-modal-stack';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/use-i18n';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  confirmOnClose?: boolean;
  closeConfirmation?: string;
};

export function Modal({ open, title, description, onClose, children, footer, size = 'md', confirmOnClose = false, closeConfirmation }: ModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const { mounted, closing, finishExit } = usePresence(open);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useDialogFocus(mounted, panelRef);
  useModalIsolation(mounted, layerRef);

  useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (confirmOpen) return;
    if (confirmOnClose) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [confirmOpen, confirmOnClose, onClose]);

  const cancelCloseConfirmation = useCallback(() => {
    setConfirmOpen(false);
    requestAnimationFrame(() => panelRef.current?.focus());
  }, []);

  const confirmClose = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTopmostModalLayer(layerRef.current)) {
        event.preventDefault();
        if (confirmOpen) {
          cancelCloseConfirmation();
          return;
        }
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelCloseConfirmation, confirmOpen, open, requestClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={layerRef}
      data-modal-layer="modal"
      data-state={closing ? 'closing' : 'open'}
      className="cms-modal-layer fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finishExit();
      }}
    >
      <button type="button" aria-hidden="true" tabIndex={-1} className="cms-modal-backdrop absolute inset-0 bg-[#182233]/35" onClick={requestClose} />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'cms-modal-panel relative z-10 max-h-[min(92vh,52rem)] w-full overflow-y-auto overscroll-contain rounded-xl border border-border bg-panel shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          size === 'sm' && 'max-w-lg',
          size === 'md' && 'max-w-2xl',
          size === 'lg' && 'max-w-4xl'
        )}
      >
        <header inert={confirmOpen || undefined} aria-hidden={confirmOpen || undefined} className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
          </div>
          <button type="button" aria-label={t('common.dialog.closeLabel', { title })} title={t('common.actions.close')} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={requestClose}>
            <X aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
        </header>
        <div inert={confirmOpen || undefined} aria-hidden={confirmOpen || undefined} className="px-5 py-5 sm:px-6">{children}</div>
        {footer ? <footer inert={confirmOpen || undefined} aria-hidden={confirmOpen || undefined} className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</footer> : null}
        {confirmOpen ? (
          <UnsavedChangesDialog message={closeConfirmation ?? t('common.dialog.unsavedMessage')} onCancel={cancelCloseConfirmation} onConfirm={confirmClose} />
        ) : null}
      </section>
    </div>,
    document.body
  );
}
