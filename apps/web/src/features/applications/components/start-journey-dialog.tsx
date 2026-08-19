'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useJourneyEligibility, useStartSupplyJourney } from '../services/application-queries';

type Application = components['schemas']['ApplicationDetail'];

export function StartJourneyDialog({ application, open, onClose, onSaved }: { application: Application; open: boolean; onClose: () => void; onSaved?: (journey: components['schemas']['SupplyJourney']) => void }) {
  const eligibility = useJourneyEligibility(open ? application.id : undefined);
  const startJourney = useStartSupplyJourney();
  const [templateId, setTemplateId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState(application.owner.id);
  const [startedAt, setStartedAt] = useState('');
  const [error, setError] = useState('');
  const allowed = eligibility.data?.allowed ?? false;

  useEffect(() => {
    if (open) return;
    setTemplateId(''); setOwnerUserId(application.owner.id); setStartedAt(''); setError('');
  }, [application.owner.id, open]);

  const submit = async () => {
    const template = eligibility.data?.templates.find((item) => item.id === templateId);
    if (!template || !ownerUserId || !startedAt) { setError('Cần chọn mẫu, người phụ trách và ngày bắt đầu.'); return; }
    try { const journey = await startJourney.mutateAsync({ applicationId: application.id, body: { templateId, templateVersion: template.version, ownerUserId, startedAt: new Date(startedAt).toISOString() } }); onSaved?.(journey); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể khởi tạo lộ trình'); }
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={Boolean(templateId || startedAt)} title="Khởi tạo lộ trình cung ứng" description={application.candidate.name} size="md" footer={eligibility.isPending || eligibility.error || !allowed ? <Button onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={() => void submit()} disabled={startJourney.isPending}>{startJourney.isPending ? 'Đang khởi tạo…' : 'Xác nhận khởi tạo'}</Button></>}>
    {eligibility.isPending ? <p className="text-sm text-text-muted">Đang kiểm tra điều kiện…</p> : eligibility.error ? <p role="alert" className="text-sm font-semibold text-danger">Không thể kiểm tra điều kiện khởi tạo.</p> : !allowed ? <div className="space-y-3"><p className="font-semibold text-danger">Chưa đủ điều kiện khởi tạo lộ trình.</p><ul className="list-disc pl-5 text-sm text-text-muted">{eligibility.data?.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : <div className="space-y-4"><label className="block text-sm font-semibold text-text">Mẫu lộ trình<select aria-label="Mẫu lộ trình" name="mau-lo-trinh" value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn mẫu</option>{eligibility.data?.templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.version}</option>)}</select></label><label className="block text-sm font-semibold text-text">Người phụ trách<select aria-label="Người phụ trách lộ trình" name="nguoi-phu-trach-lo-trinh" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="u-recruiter">Nguyễn Minh Anh</option><option value="u-manager">Lê Thu Hà</option></select></label><label className="block text-sm font-semibold text-text">Ngày bắt đầu<input aria-label="Ngày bắt đầu lộ trình" name="ngay-bat-dau-lo-trinh" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>{error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}</div>}
  </Modal>;
}
