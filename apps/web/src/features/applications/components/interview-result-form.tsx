'use client';

import { useId, useRef, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useSaveInterviewResult } from '../services/application-queries';
import { interviewResultSchema } from '../schemas/interview-result.schema';

type Application = components['schemas']['ApplicationDetail'];
type Interview = components['schemas']['Interview'];

export function InterviewResultForm({ application, interview, onSaved, onCancel, embedded = false }: { application: Application; interview: Interview; onSaved?: (interview: Interview) => void; onCancel?: () => void; embedded?: boolean }) {
  const [result, setResult] = useState<'PASS' | 'FAIL'>(interview.result === 'FAIL' ? 'FAIL' : 'PASS');
  const [feedback, setFeedback] = useState(interview.feedback ?? '');
  const [strengths, setStrengths] = useState(interview.strengths?.join(', ') ?? '');
  const [concerns, setConcerns] = useState(interview.concerns?.join(', ') ?? '');
  const [nextStep, setNextStep] = useState(interview.nextStep ?? '');
  const [error, setError] = useState('');
  const errorId = useId();
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const saveResult = useSaveInterviewResult();
  const title = `Nhập kết quả vòng ${interview.round}`;

  const submit = async () => {
    const parsed = interviewResultSchema.safeParse({ result, feedback, strengths: strengths.split(',').map((item) => item.trim()).filter(Boolean), concerns: concerns.split(',').map((item) => item.trim()).filter(Boolean), nextStep: nextStep || null, recordedAt: new Date().toISOString(), version: interview.version });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra thông tin');
      requestAnimationFrame(() => feedbackRef.current?.focus());
      return;
    }
    if (interview.scheduleStatus !== 'COMPLETED') {
      setError('Chỉ ghi kết quả sau khi vòng phỏng vấn hoàn tất.');
      return;
    }
    try {
      const saved = await saveResult.mutateAsync({ applicationId: application.id, interviewId: interview.id, body: parsed.data });
      onSaved?.(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu kết quả');
    }
  };

  return <form aria-label={title} className={embedded ? 'space-y-4' : 'space-y-4 rounded-lg border border-border bg-surface p-5'} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    {!embedded ? <div><h3 className="font-bold text-text">{title}</h3><p className="mt-1 text-sm text-text-muted">Phỏng vấn: {new Date(interview.scheduledAt).toLocaleString('vi-VN')}</p></div> : null}
    <label className="block text-sm font-semibold text-text">Kết quả<select aria-label="Kết quả" name="interview-result" value={result} onChange={(event) => setResult(event.target.value as 'PASS' | 'FAIL')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="PASS">Đạt</option><option value="FAIL">Không đạt</option></select></label>
    <label className="block text-sm font-semibold text-text">Nhận xét<textarea ref={feedbackRef} aria-label="Nhận xét phỏng vấn" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} name="interview-feedback" value={feedback} onChange={(event) => { setFeedback(event.target.value); setError(''); }} className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>
    <label className="block text-sm font-semibold text-text">Điểm mạnh<input aria-label="Điểm mạnh" name="interview-strengths" value={strengths} onChange={(event) => setStrengths(event.target.value)} placeholder="Giao tiếp, chuyên môn" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
    <label className="block text-sm font-semibold text-text">Điểm cần lưu ý<input aria-label="Điểm cần lưu ý" name="interview-concerns" value={concerns} onChange={(event) => setConcerns(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
    <label className="block text-sm font-semibold text-text">Bước tiếp theo<input aria-label="Bước tiếp theo" name="interview-next-step" value={nextStep} onChange={(event) => setNextStep(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
    {error ? <p id={errorId} role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary">Lưu kết quả</Button></div>
  </form>;
}
