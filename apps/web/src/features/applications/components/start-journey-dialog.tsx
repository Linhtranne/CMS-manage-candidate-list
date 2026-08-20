'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useJourneyEligibility, useStartSupplyJourney } from '../services/application-queries';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';
import { getDomainLabel } from '@/i18n/domain-labels';

type Application = components['schemas']['ApplicationDetail'];
const ownerOptions = [{ value: 'u-recruiter', key: 'adminExtraNames.recruiter' }, { value: 'u-manager', key: 'adminExtraNames.manager' }] as const;

export function StartJourneyDialog({ application, open, onClose, onSaved }: { application: Application; open: boolean; onClose: () => void; onSaved?: (journey: components['schemas']['SupplyJourney']) => void }) {
  const { t } = useI18n();
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
    if (!template || !ownerUserId || !startedAt) { setError(t('applications.journey.required')); return; }
    try { const journey = await startJourney.mutateAsync({ applicationId: application.id, body: { templateId, templateVersion: template.version, ownerUserId, startedAt: new Date(startedAt).toISOString() } }); onSaved?.(journey); onClose(); } catch (cause) { setError(localizedError(t, cause, t('applications.journey.createError'))); }
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={Boolean(templateId || startedAt)} title={t('applications.journey.title')} description={application.candidate.name} size="md" footer={eligibility.isPending || eligibility.error || !allowed ? <Button onClick={onClose}>{t('applications.journey.close')}</Button> : <><Button onClick={onClose}>{t('applications.journey.cancel')}</Button><Button variant="primary" onClick={() => void submit()} disabled={startJourney.isPending}>{startJourney.isPending ? t('applications.journey.starting') : t('applications.journey.confirm')}</Button></>}>
    {eligibility.isPending ? <p className="text-sm text-text-muted">{t('applications.journey.checking')}</p> : eligibility.error ? <p role="alert" className="text-sm font-semibold text-danger">{t('applications.journey.checkError')}</p> : !allowed ? <div className="space-y-3"><p className="font-semibold text-danger">{t('applications.journey.notEligible')}</p><ul className="list-disc pl-5 text-sm text-text-muted">{eligibility.data?.reasons.map((reason) => <li key={reason}>{getDomainLabel(t, 'journeyEligibilityReason', reason)}</li>)}</ul></div> : <div className="space-y-4"><label className="block text-sm font-semibold text-text">{t('applications.journey.template')}<select aria-label={t('applications.journey.templateAria')} name="journey-template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('applications.journey.chooseTemplate')}</option>{eligibility.data?.templates.map((template) => <option key={template.id} value={template.id}>{getDomainLabel(t, 'journeyTemplate', template.name)} · {template.version}</option>)}</select></label><label className="block text-sm font-semibold text-text">{t('applications.journey.owner')}<select aria-label={t('applications.journey.ownerAria')} name="journey-owner" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{ownerOptions.map((owner) => <option key={owner.value} value={owner.value}>{t(owner.key as Parameters<typeof t>[0])}</option>)}</select></label><label className="block text-sm font-semibold text-text">{t('applications.journey.startDate')}<input aria-label={t('applications.journey.startDateAria')} name="journey-start-date" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>{error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}</div>}
  </Modal>;
}
