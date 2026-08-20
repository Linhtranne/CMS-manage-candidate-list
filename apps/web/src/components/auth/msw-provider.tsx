'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';

const shouldStartMsw =
  process.env.NEXT_PUBLIC_MSW_ENABLED === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_MSW_ENABLED !== 'false');

let workerStartPromise: Promise<void> | undefined;

function startWorkerOnce() {
  workerStartPromise ??= import('@/mocks/browser')
    .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
    .then(() => undefined);
  return workerStartPromise;
}

export function MswProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(!shouldStartMsw);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!shouldStartMsw) return;

    let active = true;
    void startWorkerOnce()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error(t('validation.runtime.mswError')));
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorState message={t('validation.runtime.mswLoadError')} />;
  return ready ? children : <LoadingState label={t('validation.runtime.mswLoading')} />;
}
