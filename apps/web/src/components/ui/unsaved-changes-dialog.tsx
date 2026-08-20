'use client';

import { useEffect, useId, useRef } from 'react';
import { useI18n } from '@/i18n/use-i18n';

export function UnsavedChangesDialog({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#182233]/35 p-4" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-panel">
        <h3 id={titleId} className="text-lg font-bold text-text">{t('common.dialog.unsavedTitle')}</h3>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" className="min-h-10 rounded-control border border-border bg-panel px-4 text-sm font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onCancel}>{t('common.actions.continueEditing')}</button>
          <button type="button" className="min-h-10 rounded-control bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8f1d14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger" onClick={onConfirm}>{t('common.actions.discardChanges')}</button>
        </div>
      </section>
    </div>
  );
}
