'use client';

import { useI18n } from '@/i18n/use-i18n';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="cms-loading-pulse rounded-lg border border-border bg-panel p-8 text-center text-sm text-text-muted" role="status" aria-live="polite">
      {label ?? t('common.states.loading')}
    </div>
  );
}
