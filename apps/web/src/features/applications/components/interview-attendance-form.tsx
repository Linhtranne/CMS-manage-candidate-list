'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useCancelInterview, useMarkInterviewNoShow } from '../services/application-queries';

type Application = components['schemas']['ApplicationDetail'];
type Interview = components['schemas']['Interview'];

export function InterviewAttendanceForm({ application, interview, action, onSaved, onCancel }: { application: Application; interview: Interview; action: 'cancel' | 'no-show'; onSaved?: (interview: Interview) => void; onCancel?: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cancelInterview = useCancelInterview();
  const markNoShow = useMarkInterviewNoShow();
  const submit = async () => {
    if (!reason.trim()) { setError(action === 'cancel' ? 'Vui lòng nhập lý do hủy lịch' : 'Vui lòng nhập lý do không đến'); return; }
    try { const result = action === 'cancel' ? await cancelInterview.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: { reason, version: interview.version } }) : await markNoShow.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: { reason, version: interview.version } }); onSaved?.(result); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái lịch'); }
  };
  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}><h3 className="font-bold text-text">{action === 'cancel' ? 'Hủy lịch phỏng vấn' : 'Đánh dấu không đến'}</h3><p className="text-sm text-text-muted">Vòng {interview.round} · {new Date(interview.scheduledAt).toLocaleString('vi-VN')}</p><label className="block text-sm font-semibold text-text">Lý do<textarea aria-label={action === 'cancel' ? 'Lý do hủy lịch' : 'Lý do không đến'} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>{error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary">Xác nhận</Button></div></form>;
}
