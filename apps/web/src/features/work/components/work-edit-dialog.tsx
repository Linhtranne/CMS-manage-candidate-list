'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

type WorkItem = components['schemas']['WorkItem'];
type EditMode = 'due' | 'assignee';

const assignees = [
  { id: 'usr-nguyen-minh-anh', name: 'Nguyễn Minh Anh' },
  { id: 'usr-tran-thu-ha', name: 'Trần Thu Hà' },
  { id: 'usr-le-quang-huy', name: 'Lê Quang Huy' }
];

export function WorkEditDialog({ mode, item, open, isSaving, error, onClose, onSave }: { mode: EditMode; item: WorkItem; open: boolean; isSaving?: boolean; error?: string; onClose: () => void; onSave: (value: string) => void }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'due') {
      const date = new Date(item.dueAt);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      setValue(local);
    } else {
      setValue(item.assignee.id);
    }
  }, [item, mode, open]);

  const title = mode === 'due' ? 'Đổi hạn xử lý' : 'Chuyển người phụ trách';
  const description = mode === 'due' ? 'Cập nhật hạn và ghi lại phiên bản mới của công việc.' : 'Chọn nhân sự nội bộ sẽ tiếp nhận công việc này.';
  return <Modal open={open} title={title} description={description} onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button variant="primary" disabled={!value || isSaving} onClick={() => onSave(value)}>{isSaving ? 'Đang lưu' : 'Lưu thay đổi'}</Button></>}>
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted"><strong className="text-text">{item.title}</strong><p className="mt-1">{item.candidate.name} · {item.order.code}</p></div>
      <label className="block text-sm font-semibold text-text">{mode === 'due' ? 'Hạn xử lý mới' : 'Người phụ trách mới'}
        {mode === 'due' ? <input aria-label="Hạn xử lý mới" name="han-xu-ly-moi" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /> : <select aria-label="Người phụ trách mới" name="nguoi-phu-trach-moi" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select>}
      </label>
      {error ? <p role="alert" className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-3 text-sm text-danger">{error}</p> : null}
    </div>
  </Modal>;
}
