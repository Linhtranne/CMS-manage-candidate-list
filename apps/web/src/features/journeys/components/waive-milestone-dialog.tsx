'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { translateValidationIssue } from '@/i18n/validation';
import { localizedError } from '@/i18n/errors';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useWaiveMilestone } from '../services/journey-queries';
import { waiverSchema } from '../schemas/milestone.schema';

type Milestone = components['schemas']['JourneyMilestone'];

export function WaiveMilestoneDialog({ journeyId, milestone, open, onClose, onSaved }: { journeyId: string; milestone: Milestone; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const mutation = useWaiveMilestone(journeyId);
  const [reason, setReason] = useState('');
  const [approverId, setApproverId] = useState('u-manager');
  const [error, setError] = useState('');
  const submit = async () => {
    const parsed = waiverSchema.safeParse({ reason, approverId, evidenceIds: milestone.evidenceIds, version: milestone.version });
    if (!parsed.success) { setError(translateValidationIssue(t, parsed.error.issues[0], 'journeys.milestone.validation')); return; }
    try { await mutation.mutateAsync({ milestoneId: milestone.id, body: parsed.data }); onSaved?.(); onClose(); } catch (cause) { setError(localizedError(t, cause, t('journeys.milestone.waiveError'))); }
  };
  return <Modal open={open} onClose={onClose} title={t('journeys.milestone.waiveTitle')} description={getDomainLabel(t, 'milestoneName', milestone.name)} size="md" footer={<><Button onClick={onClose}>{t('journeys.detail.cancel')}</Button><Button variant="primary" onClick={() => void submit()} disabled={mutation.isPending}>{mutation.isPending ? t('journeys.milestone.saving') : t('journeys.milestone.confirmWaive')}</Button></>}>
    <div className="space-y-4"><label className="block text-sm font-semibold text-text">{t('journeys.milestone.waiveReason')}<textarea aria-label={t('journeys.milestone.waiveReason')} name="waiver-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold text-text">{t('journeys.milestone.approver')}<select aria-label={t('journeys.milestone.approverAria')} name="milestone-approver" value={approverId} onChange={(event) => setApproverId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="u-manager">{t('journeys.milestone.approvers.manager')}</option><option value="u-coordinator">{t('journeys.milestone.approvers.coordinator')}</option></select></label>{error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}</div>
  </Modal>;
}
