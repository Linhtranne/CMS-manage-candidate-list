'use client';

import { useState } from 'react';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { Button } from '@/components/ui/button';
import { closeOrderSchema } from '../schemas/order-status.schema';
import { useUpdateOrderStatus } from '../services/order-queries';

const allowedTransitions: Record<JobOrder['status'], JobOrder['status'][]> = {
  DRAFT: ['DRAFT', 'RECRUITING'],
  RECRUITING: ['RECRUITING', 'PAUSED', 'FILLED'],
  PAUSED: ['PAUSED', 'RECRUITING', 'FILLED'],
  FILLED: ['FILLED', 'CLOSED'],
  CLOSED: ['CLOSED']
};

export function OrderStatusForm({ order, onSaved }: { order: JobOrder; onSaved: () => void }) {
  const [status, setStatus] = useState<JobOrder['status']>(order.status);
  const [error, setError] = useState('');
  const mutation = useUpdateOrderStatus();

  const submit = () => {
    if (!allowedTransitions[order.status].includes(status)) {
      setError('Trạng thái không hợp lệ theo lộ trình đơn tuyển. Hãy đi qua các bước tuần tự.');
      return;
    }
    if (status === 'CLOSED') {
      if (order.status !== 'FILLED') {
        setError('Chỉ đóng đơn sau khi đã đủ chỉ tiêu. Hủy hoặc thay thế đơn dùng action ngoại lệ.');
        return;
      }
      const result = closeOrderSchema.safeParse({ status, reasonCode: 'TARGET_FILLED', version: order.version });
      if (!result.success) { setError(result.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin'); return; }
    }
    setError('');
    mutation.mutate({ orderId: order.id, body: { status, reasonCode: status === 'CLOSED' ? 'TARGET_FILLED' : 'STATUS_CHANGE', version: order.version } }, {
      onSuccess: onSaved,
      onError: (cause) => setError(cause instanceof Error ? cause.message : 'Không thể lưu trạng thái đơn tuyển.')
    });
  };

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="block text-sm font-semibold text-text">Trạng thái<select aria-label="Trạng thái" name="trang-thai" value={status} onChange={(event) => { setStatus(event.target.value as JobOrder['status']); setError(''); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{([['DRAFT', 'Nháp'], ['RECRUITING', 'Đang tuyển'], ['PAUSED', 'Tạm dừng'], ['FILLED', 'Đủ chỉ tiêu'], ['CLOSED', 'Đóng']] as const).map(([value, label]) => <option key={value} value={value} disabled={!allowedTransitions[order.status].includes(value)}>{label}{!allowedTransitions[order.status].includes(value) ? ' · chưa hợp lệ' : ''}</option>)}</select></label>
    {status === 'CLOSED' && order.status === 'FILLED' ? <p className="text-sm text-text-muted">Hệ thống tự ghi nhận lý do hoàn tất nhu cầu vào lịch sử.</p> : null}
    {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    <Button type="submit" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu' : 'Lưu thay đổi'}</Button>
  </form>;
}
