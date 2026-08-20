'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { useOrders } from '@/features/orders/services/order-queries';
import { AddCandidatesDialog } from '@/features/orders/components/add-candidates-dialog';
import { useI18n } from '@/i18n/use-i18n';
import { occupationLabel } from '@/i18n/catalog-options';

export function AddApplicationDialog({ open, onClose, initialCandidateId }: { open: boolean; onClose: () => void; initialCandidateId?: string }) {
  const { t } = useI18n();
  const orders = useOrders({ status: 'RECRUITING' });
  const [orderId, setOrderId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const selectOrder = () => setOrderId(draftOrderId);
  const close = () => { setOrderId(''); setDraftOrderId(''); onClose(); };

  return <>
    <Modal open={open && !orderId} onClose={close} confirmOnClose={Boolean(draftOrderId)} title={t('applications.add.title')} description={t('applications.add.description')} size="md" footer={<><Button onClick={close}>{t('applications.add.cancel')}</Button><Button variant="primary" onClick={selectOrder} disabled={!draftOrderId}>{t('applications.add.chooseCandidates')}</Button></>}>
      {orders.isPending ? <LoadingState label={t('applications.add.loadingOrders')} /> : <label className="block text-sm font-semibold text-text">{t('applications.add.order')}<select aria-label={t('applications.add.orderAria')} name="application-order" value={draftOrderId} onChange={(event) => setDraftOrderId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('applications.add.chooseOrder')}</option>{orders.data?.items.map((order) => <option key={order.id} value={order.id}>{order.code} · {occupationLabel(t, order.position)}</option>)}</select></label>}
    </Modal>
    {orderId ? <AddCandidatesDialog orderId={orderId} open={open} onClose={close} initialCandidateId={initialCandidateId} /> : null}
  </>;
}
