'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useDecideApplication } from '../services/application-queries';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';

type Application = components['schemas']['ApplicationDetail'];
type Decision = components['schemas']['ApplicationDecisionRequest']['status'];

export function ApplicationDecisionDialog({ application, open, onClose, onSaved }: { application: Application; open: boolean; onClose: () => void; onSaved?: (application: components['schemas']['Application']) => void }) {
  const { t } = useI18n();
  const [reasonCode, setReasonCode] = useState(application.decisionReason ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const decide = useDecideApplication();

  useEffect(() => {
    if (open) return;
    setReasonCode(application.decisionReason ?? ''); setNote(''); setError('');
  }, [application.decisionReason, open]);

  const submit = async (status: Decision) => {
    const completed = application.interviews.filter((item) => item.scheduleStatus === 'COMPLETED' && item.result !== 'PENDING');
    if (status === 'PASSED' && !completed.length) { setError(t('applications.decision.interviewRequired')); return; }
    if (status === 'PASSED' && !completed.some((item) => item.result === 'PASS')) { setError(t('applications.decision.interviewNotPassed')); return; }
    if ((status === 'FAILED' || status === 'WITHDRAWN') && !reasonCode.trim()) { setError(t('applications.decision.reasonRequired')); return; }
    try { const saved = await decide.mutateAsync({ applicationId: application.id, body: { status, reasonCode: reasonCode || null, note: note || null, decidedAt: new Date().toISOString(), version: application.version } }); onSaved?.(saved); onClose(); } catch (cause) { setError(localizedError(t, cause, t('applications.decision.saveError'))); }
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={Boolean(reasonCode.trim() || note.trim())} title={t('applications.decision.title')} description={`${application.candidate.code} · ${application.candidate.name} · ${application.order.code}`} size="md" footer={<><Button variant="secondary" onClick={() => void submit('WITHDRAWN')}>{t('applications.decision.withdraw')}</Button><Button variant="danger" onClick={() => void submit('FAILED')}>{t('applications.decision.failed')}</Button><Button variant="primary" onClick={() => void submit('PASSED')}>{t('applications.decision.passed')}</Button></>}>
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-text">{t('applications.decision.reason')}<input aria-label={t('applications.decision.reasonAria')} name="closing-reason" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>
      <label className="block text-sm font-semibold text-text">{t('applications.decision.note')}<textarea aria-label={t('applications.decision.noteAria')} name="decision-note" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  </Modal>;
}
