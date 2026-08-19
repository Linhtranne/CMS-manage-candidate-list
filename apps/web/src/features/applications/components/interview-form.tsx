'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useCreateInterview, useRescheduleInterview } from '../services/application-queries';
import { interviewSchema, rescheduleInterviewSchema } from '../schemas/interview.schema';

type Application = components['schemas']['ApplicationDetail'];
type Interview = components['schemas']['Interview'];

export function InterviewForm({ application, interview, mode = 'create', onSaved, onCancel, embedded = false }: { application: Application; interview?: Interview; mode?: 'create' | 'reschedule'; onSaved?: (interview: Interview) => void; onCancel?: () => void; embedded?: boolean }) {
  const [scheduledAt, setScheduledAt] = useState(interview ? interview.scheduledAt.slice(0, 16) : '');
  const [timeZone, setTimeZone] = useState(interview?.timeZone ?? 'Asia/Ho_Chi_Minh');
  const [interviewMode, setInterviewMode] = useState<'ONLINE' | 'IN_PERSON'>(interview?.mode ?? 'ONLINE');
  const [meetingUrl, setMeetingUrl] = useState(interview?.meetingUrl ?? '');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [participants, setParticipants] = useState(interview?.participants.map((item) => item.id).join(',') ?? 'u-recruiter');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const createInterview = useCreateInterview();
  const rescheduleInterview = useRescheduleInterview();

  const submit = async () => {
    const common = { scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : '', timeZone, mode: interviewMode, meetingUrl: meetingUrl || null, location: location || null, participants: participants.split(',').map((item) => item.trim()).filter(Boolean) };
    const parsed = mode === 'reschedule' ? rescheduleInterviewSchema.safeParse({ ...common, reason }) : interviewSchema.safeParse(common);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin'); return; }
    setError('');
    try {
      const result = mode === 'reschedule' && interview
        ? await rescheduleInterview.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: { ...parsed.data, version: interview.version } as components['schemas']['RescheduleInterviewRequest'] })
        : await createInterview.mutateAsync({ applicationId: application.id, body: { ...parsed.data, version: application.version } as components['schemas']['CreateInterviewRequest'] });
      onSaved?.(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu lịch phỏng vấn');
    }
  };

  const title = mode === 'reschedule' ? 'Đổi lịch phỏng vấn' : `Lên lịch vòng ${application.interviews.length + 1}`;
  return <form aria-label={title} noValidate className={embedded ? 'space-y-4' : 'space-y-4 rounded-lg border border-border bg-surface p-5'} onSubmit={(event) => { event.preventDefault(); void submit(); }}>{!embedded ? <div><h3 className="font-bold text-text">{title}</h3>{mode === 'reschedule' && interview ? <p className="mt-1 text-sm text-text-muted">Lịch cũ: {new Date(interview.scheduledAt).toLocaleString('vi-VN')}</p> : null}</div> : mode === 'reschedule' && interview ? <p className="text-sm text-text-muted">Lịch cũ: {new Date(interview.scheduledAt).toLocaleString('vi-VN')}</p> : null}<label className="block text-sm font-semibold text-text">Thời gian<input aria-label="Thời gian phỏng vấn" name="interview-scheduled-at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">Múi giờ<select aria-label="Múi giờ" name="interview-time-zone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn múi giờ</option><option value="Asia/Ho_Chi_Minh">GMT+7 · Việt Nam</option><option value="Asia/Tokyo">GMT+9 · Nhật Bản</option><option value="UTC">UTC</option></select></label><label className="block text-sm font-semibold text-text">Hình thức<select aria-label="Hình thức phỏng vấn" name="interview-mode" value={interviewMode} onChange={(event) => setInterviewMode(event.target.value as 'ONLINE' | 'IN_PERSON')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="ONLINE">Trực tuyến</option><option value="IN_PERSON">Trực tiếp</option></select></label>{interviewMode === 'ONLINE' ? <label className="block text-sm font-semibold text-text">Đường dẫn phòng phỏng vấn<input aria-label="Đường dẫn phòng phỏng vấn" name="interview-meeting-url" type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://…" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label> : <label className="block text-sm font-semibold text-text">Địa điểm<input aria-label="Địa điểm phỏng vấn" name="interview-location" value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>}<label className="block text-sm font-semibold text-text">Người tham gia<input aria-label="Người tham gia" name="interview-participants" value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="u-recruiter, u-manager…" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /><span className="mt-1 block text-xs font-normal text-text-muted">Nhập mã nhân sự, phân tách bằng dấu phẩy.</span></label>{mode === 'reschedule' ? <label className="block text-sm font-semibold text-text">Lý do đổi lịch<textarea aria-label="Lý do đổi lịch" name="interview-reschedule-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label> : null}{error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary">{mode === 'reschedule' ? 'Xác nhận đổi lịch' : 'Lưu lịch phỏng vấn'}</Button></div></form>;
}
