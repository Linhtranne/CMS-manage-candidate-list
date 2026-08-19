'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { components } from '@cms/contracts';
import { usePresence } from '@/hooks/use-presence';
import { useDialogFocus } from '@/hooks/use-dialog-focus';
import { EmailComposer } from './email-composer';
import { isTopmostModalLayer, useModalIsolation } from '@/hooks/use-modal-stack';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';

type Conversation = components['schemas']['ConversationDetail'];

export function ComposerModal({ open, conversation, onClose, onRefetch }: { open: boolean; conversation: Conversation; onClose: () => void; onRefetch?: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mounted, closing, finishExit } = usePresence(open);

  useDialogFocus(mounted, panelRef);
  useModalIsolation(mounted, layerRef);

  useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (!isTopmostModalLayer(layerRef.current)) return;
    if (confirmOpen) return;
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [confirmOpen, dirty, onClose]);

  const cancelCloseConfirmation = useCallback(() => {
    setConfirmOpen(false);
    requestAnimationFrame(() => panelRef.current?.focus());
  }, []);

  const confirmClose = useCallback(() => {
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmOpen) {
          cancelCloseConfirmation();
          return;
        }
        requestClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelCloseConfirmation, confirmOpen, mounted, requestClose]);

  if (!mounted) return null;

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !closing) return;
    finishExit();
  };

  return createPortal(<div ref={layerRef} className="cms-modal-layer fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4" data-modal-layer="nested" data-state={closing ? 'closing' : 'open'} onAnimationEnd={handleAnimationEnd} role="presentation"><button type="button" aria-hidden="true" tabIndex={-1} className="cms-modal-backdrop absolute inset-0 bg-[#182233]/45 backdrop-blur-[1px]" onClick={requestClose} /><section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Soạn email trả lời" className="cms-modal-panel cms-full-bleed-modal-panel relative z-10 flex h-full w-full flex-col overflow-hidden border-border bg-panel shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:h-auto sm:max-h-[min(90vh,48rem)] sm:max-w-[min(92vw,48rem)] sm:rounded-xl sm:border"><header inert={confirmOpen || undefined} aria-hidden={confirmOpen || undefined} className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Phản hồi ứng viên</p><h2 className="mt-1 text-lg font-bold text-text">Soạn email trả lời</h2><p className="mt-1 text-sm text-text-muted">From: ungvien@company.vn · thư gửi đi sẽ được lưu vết</p></div><button type="button" aria-label="Đóng cửa sổ trả lời email" title="Đóng" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={requestClose}><X aria-hidden="true" size={20} strokeWidth={1.8} /></button></header><div inert={confirmOpen || undefined} aria-hidden={confirmOpen || undefined} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><EmailComposer conversation={conversation} showHeader={false} onDirtyChange={setDirty} onCancel={() => { onRefetch?.(); onClose(); }} /></div>{confirmOpen ? <UnsavedChangesDialog message="Bạn có thay đổi chưa lưu. Đóng cửa sổ trả lời?" onCancel={cancelCloseConfirmation} onConfirm={confirmClose} /> : null}</section></div>, document.body);
}
