'use client';

import { useI18n } from '@/i18n/use-i18n';
import { Button } from './button';

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-6 text-center" role="alert">
      <p className="text-sm text-danger">{message ?? t('common.errors.loadFailed')}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>{t('common.actions.retry')}</Button> : null}
    </div>
  );
}
