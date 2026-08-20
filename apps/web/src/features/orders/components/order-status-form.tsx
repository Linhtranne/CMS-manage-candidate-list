'use client';

import { useState } from 'react';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { Button } from '@/components/ui/button';
import { closeOrderSchema } from '../schemas/order-status.schema';
import { useUpdateOrderStatus } from '../services/order-queries';
import { useI18n } from '@/i18n/use-i18n';
import { translateValidationIssue } from '@/i18n/validation';
import { localizedError } from '@/i18n/errors';

const allowedTransitions: Record<JobOrder['status'], JobOrder['status'][]> = {
  DRAFT: ['DRAFT', 'RECRUITING'],
  RECRUITING: ['RECRUITING', 'PAUSED', 'FILLED'],
  PAUSED: ['PAUSED', 'RECRUITING', 'FILLED'],
  FILLED: ['FILLED', 'CLOSED'],
  CLOSED: ['CLOSED']
};

export function OrderStatusForm({ order, onSaved }: { order: JobOrder; onSaved: () => void }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<JobOrder['status']>(order.status);
  const [error, setError] = useState('');
  const mutation = useUpdateOrderStatus();

  const submit = () => {
    if (!allowedTransitions[order.status].includes(status)) {
      setError(t('orders.status.invalid'));
      return;
    }
    if (status === 'CLOSED') {
      if (order.status !== 'FILLED') {
        setError(t('orders.status.closeOnlyFilled'));
        return;
      }
      const result = closeOrderSchema.safeParse({ status, reasonCode: 'TARGET_FILLED', version: order.version });
      if (!result.success) { setError(translateValidationIssue(t, result.error.issues[0], 'orders.status.validation')); return; }
    }
    setError('');
    mutation.mutate({ orderId: order.id, body: { status, reasonCode: status === 'CLOSED' ? 'TARGET_FILLED' : 'STATUS_CHANGE', version: order.version } }, {
      onSuccess: onSaved,
      onError: (cause) => setError(localizedError(t, cause, t('orders.status.saveError')))
    });
  };

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="block text-sm font-semibold text-text">{t('orders.status.label')}<select aria-label={t('orders.status.aria')} name="order-status" value={status} onChange={(event) => { setStatus(event.target.value as JobOrder['status']); setError(''); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{([['DRAFT', 'orders.status.draft'], ['RECRUITING', 'orders.status.recruiting'], ['PAUSED', 'orders.status.paused'], ['FILLED', 'orders.status.filled'], ['CLOSED', 'orders.status.closed']] as const).map(([value, key]) => <option key={value} value={value} disabled={!allowedTransitions[order.status].includes(value)}>{t(key)}{!allowedTransitions[order.status].includes(value) ? ` · ${t('orders.status.invalidOption')}` : ''}</option>)}</select></label>
    {status === 'CLOSED' && order.status === 'FILLED' ? <p className="text-sm text-text-muted">{t('orders.status.autoReason')}</p> : null}
    {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    <Button type="submit" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? t('orders.status.saving') : t('orders.status.save')}</Button>
  </form>;
}
