'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { useOrders } from '@/features/orders/services/order-queries';
import { AddCandidatesDialog } from '@/features/orders/components/add-candidates-dialog';

export function AddApplicationDialog({ open, onClose, initialCandidateId }: { open: boolean; onClose: () => void; initialCandidateId?: string }) {
  const orders = useOrders({ status: 'RECRUITING' });
  const [orderId, setOrderId] = useState('');
  const [draftOrderId, setDraftOrderId] = useState('');
  const selectOrder = () => setOrderId(draftOrderId);
  const close = () => { setOrderId(''); setDraftOrderId(''); onClose(); };

  return <>
    <Modal open={open && !orderId} onClose={close} confirmOnClose={Boolean(draftOrderId)} title="Thêm ứng viên vào pipeline" description="Chọn đơn tuyển trước, sau đó chọn các hồ sơ ứng viên cần tạo đơn ứng tuyển." size="md" footer={<><Button onClick={close}>Hủy</Button><Button variant="primary" onClick={selectOrder} disabled={!draftOrderId}>Chọn ứng viên</Button></>}>
      {orders.isPending ? <LoadingState label="Đang tải đơn tuyển" /> : <label className="block text-sm font-semibold text-text">Đơn tuyển<select aria-label="Đơn tuyển để tạo ứng tuyển" name="don-tuyen-de-tao-ung-tuyen" value={draftOrderId} onChange={(event) => setDraftOrderId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn đơn tuyển đang tuyển</option>{orders.data?.items.map((order) => <option key={order.id} value={order.id}>{order.code} · {order.position}</option>)}</select></label>}
    </Modal>
    {orderId ? <AddCandidatesDialog orderId={orderId} open={open} onClose={close} initialCandidateId={initialCandidateId} /> : null}
  </>;
}
