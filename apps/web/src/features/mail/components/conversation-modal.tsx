'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { components } from '@cms/contracts';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { usePresence } from '@/hooks/use-presence';
import { ConversationThread } from './conversation-thread';

type Conversation = components['schemas']['ConversationDetail'];

export function ConversationModal({ open, conversation, isLoading, error, onClose, onRetry, onRefetch, onExited }: { open: boolean; conversation?: Conversation; isLoading?: boolean; error?: string; onClose: () => void; onRetry?: () => void; onRefetch?: () => void; onExited?: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const { mounted, closing, finishExit } = usePresence(open);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[data-modal-layer="nested"][data-state="open"]')) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !closing) return;
    finishExit();
    onExited?.();
  };

  return <div className="cms-modal-layer fixed inset-0 z-50 flex items-center justify-center" data-state={closing ? 'closing' : 'open'} onAnimationEnd={handleAnimationEnd} role="presentation"><button type="button" aria-label="Đóng lớp chi tiết email" title="Đóng" className="cms-modal-backdrop absolute inset-0 bg-[#182233]/40 backdrop-blur-[1px]" onClick={onClose} /><section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Chi tiết hộp thư chung" className="cms-modal-panel relative z-10 flex h-screen w-screen flex-col overflow-hidden bg-panel shadow-panel focus:outline-none"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Hộp thư chung</p><h2 className="mt-1 text-lg font-bold text-text">Chi tiết chuỗi email</h2><p className="mt-1 text-sm text-text-muted">Lịch sử bất biến và ngữ cảnh nghiệp vụ</p></div><button type="button" aria-label="Đóng chi tiết email" title="Đóng" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border text-text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none" onClick={onClose}><X aria-hidden="true" size={20} strokeWidth={1.8} /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">{isLoading ? <LoadingState label="Đang tải chuỗi email" /> : error || !conversation ? <ErrorState message={error ?? 'Không thể tải chuỗi email.'} onRetry={onRetry} /> : <ConversationThread conversation={conversation} onRefetch={onRefetch} />}</div></section></div>;
}
