'use client';

import { useId, useRef, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useCancelInterview, useMarkInterviewNoShow } from '../services/application-queries';

type Application = components['schemas']['ApplicationDetail'];
type Interview = components['schemas']['Interview'];

export function InterviewAttendanceForm({ application, interview, action, onSaved, onCancel, embedded = false }: { application: Application; interview: Interview; action: 'cancel' | 'no-show'; onSaved?: (interview: Interview) => void; onCancel?: () => void; embedded?: boolean }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const errorId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const cancelInterview = useCancelInterview();
  const markNoShow = useMarkInterviewNoShow();
  const title = action === 'cancel' ? 'Hủy lịch phỏng vấn' : 'Đánh dấu không đến';

  const submit = async () => {
    if (!reason.trim()) {
      setError(action === 'cancel' ? 'Vui lòng nhập lý do hủy lịch' : 'Vui lòng nhập lý do không đến');
      requestAnimationFrame(() => reasonRef.current?.focus());
      return;
    }
    try {
      const result = action === 'cancel'
        ? await cancelInterview.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: { reason, version: interview.version } })
        : await markNoShow.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: { reason, version: interview.version } });
      onSaved?.(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái lịch');
    }
  };

  return <form aria-label={title} className={embedded ? 'space-y-4' : 'space-y-4 rounded-lg border border-border bg-surface p-5'} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    {!embedded ? <h3 className="font-bold text-text">{title}</h3> : null}
    {!embedded ? <p className="text-sm text-text-muted">Vòng {interview.round} · {new Date(interview.scheduledAt).toLocaleString('vi-VN')}</p> : null}
    <label className="block text-sm font-semibold text-text">Lý do<textarea ref={reasonRef} aria-label={action === 'cancel' ? 'Lý do hủy lịch' : 'Lý do không đến'} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} name="interview-attendance-reason" value={reason} onChange={(event) => { setReason(event.target.value); setError(''); }} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>
    {error ? <p id={errorId} role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary">Xác nhận</Button></div>
  </form>;
}
