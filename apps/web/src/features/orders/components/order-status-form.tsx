'use client';

import { useState } from 'react';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { Button } from '@/components/ui/button';
import { closeOrderSchema } from '../schemas/order-status.schema';

export function OrderStatusForm({ order, onSaved }: { order: JobOrder; onSaved: () => void }) {
  const [status, setStatus] = useState<JobOrder['status']>(order.status);
  const [error, setError] = useState('');

  const submit = () => {
    if (status === 'CLOSED') {
      if (order.status !== 'FILLED') {
        setError('Chỉ đóng đơn sau khi đã đủ chỉ tiêu. Hủy hoặc thay thế đơn dùng action ngoại lệ.');
        return;
      }
      const result = closeOrderSchema.safeParse({ status, reasonCode: 'TARGET_FILLED', version: order.version });
      if (!result.success) { setError(result.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin'); return; }
    }
    setError('');
    onSaved();
  };

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <label className="block text-sm font-semibold text-text">Trạng thái<select aria-label="Trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as JobOrder['status']); setError(''); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="DRAFT">Nháp</option><option value="RECRUITING">Đang tuyển</option><option value="PAUSED">Tạm dừng</option><option value="FILLED">Đủ chỉ tiêu</option><option value="CLOSED">Đóng</option></select></label>
    {status === 'CLOSED' && order.status === 'FILLED' ? <p className="text-sm text-text-muted">Hệ thống tự ghi nhận lý do hoàn tất nhu cầu vào lịch sử.</p> : null}
    {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    <Button type="submit" variant="primary">Lưu thay đổi</Button>
  </form>;
}
