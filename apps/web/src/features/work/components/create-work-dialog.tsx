'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateWorkItem } from '../services/work-queries';

type Candidate = components['schemas']['CandidateDetail'];
type Priority = components['schemas']['CreateWorkItemRequest']['priority'];

export function CreateWorkDialog({ candidate, open, onClose, onSaved }: { candidate: Candidate; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const mutation = useCreateWorkItem();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const reset = () => { setTitle(''); setPriority('NORMAL'); setDueAt(''); setNotes(''); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    if (!title.trim() || !dueAt) return;
    const application = candidate.applications[0];
    mutation.mutate({ title: title.trim(), priority, dueAt: new Date(dueAt).toISOString(), candidateId: candidate.id, orderId: application?.order.id ?? null, clientId: application?.client.id ?? null, notes: notes.trim() || null }, { onSuccess: () => { reset(); onSaved?.(); onClose(); } });
  };
  return <Modal open={open} title="Tạo công việc ứng viên" description="Công việc sẽ xuất hiện trong hàng đợi nội bộ và giữ liên kết với hồ sơ hiện tại." onClose={close} confirmOnClose={Boolean(title.trim() || dueAt || notes.trim())} closeConfirmation="Bạn có thay đổi chưa lưu. Đóng biểu mẫu?" size="md" footer={<><Button variant="secondary" onClick={close}>Hủy</Button><Button variant="primary" disabled={mutation.isPending || !title.trim() || !dueAt} onClick={submit}>{mutation.isPending ? 'Đang tạo…' : 'Tạo công việc'}</Button></>}><div className="space-y-4">{mutation.error ? <p role="alert" className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-3 text-sm font-semibold text-danger">{mutation.error instanceof Error ? mutation.error.message : 'Không thể tạo công việc.'}</p> : null}<div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted"><strong className="text-text">{candidate.code} · {candidate.name}</strong><p className="mt-1">{candidate.applications[0] ? `${candidate.applications[0].order.code} · ${candidate.applications[0].client.name}` : 'Chưa gắn đơn tuyển hoặc khách hàng'}</p></div><label className="block text-sm font-semibold text-text">Tên công việc<input aria-label="Tên công việc ứng viên" name="ten-cong-viec-ung-vien" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Bổ sung chứng chỉ tiếng Nhật" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-text">Ưu tiên<select aria-label="Ưu tiên công việc ứng viên" name="uu-tien-cong-viec-ung-vien" value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="URGENT">Khẩn cấp</option><option value="HIGH">Cao</option><option value="NORMAL">Bình thường</option></select></label><label className="block text-sm font-semibold text-text">Hạn xử lý<input aria-label="Hạn công việc ứng viên" name="han-cong-viec-ung-vien" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label></div><label className="block text-sm font-semibold text-text">Ghi chú<textarea aria-label="Ghi chú công việc ứng viên" name="ghi-chu-cong-viec-ung-vien" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></div></Modal>;
}
