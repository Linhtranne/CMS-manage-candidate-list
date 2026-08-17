'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

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
        if (active) setError(reason instanceof Error ? reason : new Error('Không thể khởi tạo mock runtime'));
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorState message="Không thể khởi tạo môi trường làm việc. Vui lòng tải lại trang." />;
  return ready ? children : <LoadingState label="Đang khởi tạo môi trường làm việc" />;
}
