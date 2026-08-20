'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import { translateValidationIssue } from '@/i18n/validation';
import { localizedError } from '@/i18n/errors';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useUpdateMilestone } from '../services/journey-queries';
import { milestoneSchema } from '../schemas/milestone.schema';
import { DepartureFields } from './departure-fields';

type Milestone = components['schemas']['JourneyMilestone'];
type Journey = components['schemas']['SupplyJourneyDetail'];
type EditableStatus = Exclude<Milestone['status'], 'WAIVED'>;

const statuses: Array<[EditableStatus, 'journeys.milestone.statuses.notStarted' | 'journeys.milestone.statuses.inProgress' | 'journeys.milestone.statuses.completed' | 'journeys.milestone.statuses.blocked' | 'journeys.milestone.statuses.notApplicable']> = [
  ['NOT_STARTED', 'journeys.milestone.statuses.notStarted'], ['IN_PROGRESS', 'journeys.milestone.statuses.inProgress'], ['COMPLETED', 'journeys.milestone.statuses.completed'], ['BLOCKED', 'journeys.milestone.statuses.blocked'], ['NOT_APPLICABLE', 'journeys.milestone.statuses.notApplicable']
];

export function MilestoneForm({ journey, milestone, onCancel, onSaved }: { journey: Journey; milestone: Milestone; onCancel: () => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const mutation = useUpdateMilestone(journey.id);
  const [status, setStatus] = useState<EditableStatus>(milestone.status === 'WAIVED' ? 'COMPLETED' : milestone.status);
  const [blockerParty, setBlockerParty] = useState<Milestone['blockerParty']>(milestone.blockerParty ?? null);
  const [blockerReason, setBlockerReason] = useState(milestone.blockerReason ?? '');
  const [naReason, setNaReason] = useState(milestone.naReason ?? '');
  const [evidenceIds, setEvidenceIds] = useState(milestone.evidenceIds);
  const [departureDate, setDepartureDate] = useState(journey.departurePlan?.departureDate ? journey.departurePlan.departureDate.slice(0, 16) : '');
  const [airport, setAirport] = useState(journey.departurePlan?.airport ?? '');
  const [departureNote, setDepartureNote] = useState(journey.departurePlan?.note ?? '');
  const [error, setError] = useState('');

  const submit = async () => {
    const parsed = milestoneSchema.safeParse({ status, blockerParty: blockerParty ?? null, blockerReason: blockerReason || null, naReason: naReason || null, evidenceIds, version: milestone.version });
    if (!parsed.success) { setError(translateValidationIssue(t, parsed.error.issues[0], 'journeys.milestone.validation')); return; }
    if (status === 'COMPLETED' && milestone.requiredEvidenceCount > evidenceIds.length) { setError(t('journeys.milestone.insufficientEvidence')); return; }
    if (status === 'BLOCKED' && (!blockerParty || !blockerReason.trim())) { setError(t('journeys.milestone.blockerRequired')); return; }
    if (status === 'NOT_APPLICABLE' && !naReason.trim()) { setError(t('journeys.milestone.naRequired')); return; }
    try { await mutation.mutateAsync({ milestoneId: milestone.id, body: parsed.data }); onSaved?.(); } catch (cause) { setError(localizedError(t, cause, t('journeys.milestone.updateError'))); }
  };

  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}><div><h3 className="font-bold text-text">{t('journeys.milestone.formTitle', { name: getDomainLabel(t, 'milestoneName', milestone.name) })}</h3><p className="mt-1 text-sm text-text-muted">{t('journeys.milestone.formVersion', { sequence: milestone.sequence, version: milestone.version })}</p></div><label className="block text-sm font-semibold text-text">{t('journeys.milestone.status')}<select aria-label={t('journeys.milestone.statusAria')} name="milestone-status" value={status} onChange={(event) => setStatus(event.target.value as EditableStatus)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{statuses.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>{status === 'BLOCKED' ? <div className="space-y-3"><label className="block text-sm font-semibold text-text">{t('journeys.milestone.blockerParty')}<select aria-label={t('journeys.milestone.blockerPartyAria')} name="blocker-party" value={blockerParty ?? ''} onChange={(event) => setBlockerParty((event.target.value || null) as Milestone['blockerParty'])} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('journeys.milestone.chooseParty')}</option><option value="CANDIDATE">{t('journeys.milestone.partyCandidate')}</option><option value="CLIENT_PARTNER">{t('journeys.milestone.partyClient')}</option><option value="INTERNAL">{t('journeys.milestone.partyInternal')}</option><option value="OTHER">{t('journeys.milestone.partyOther')}</option></select></label><label className="block text-sm font-semibold text-text">{t('journeys.milestone.blockerReason')}<textarea aria-label={t('journeys.milestone.blockerReason')} name="blocker-reason" value={blockerReason} onChange={(event) => setBlockerReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></div> : null}{status === 'NOT_APPLICABLE' ? <label className="block text-sm font-semibold text-text">{t('journeys.milestone.naReason')}<textarea aria-label={t('journeys.milestone.naReason')} name="not-applicable-reason" value={naReason} onChange={(event) => setNaReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label> : null}<label className="block text-sm font-semibold text-text">{t('journeys.milestone.evidenceIds')}<input aria-label={t('journeys.milestone.evidenceIdsAria')} name="evidence-ids" value={evidenceIds.join(', ')} onChange={(event) => setEvidenceIds(event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder={t('journeys.milestone.evidencePlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /><span className="mt-1 block text-xs font-normal text-text-muted">{t('journeys.milestone.requiredFiles', { count: milestone.requiredEvidenceCount })}</span></label>{milestone.code === 'DEPARTURE_PLAN' && journey.hasDeparturePlan ? <DepartureFields departureDate={departureDate} airport={airport} note={departureNote} onChange={(patch) => { if (patch.departureDate !== undefined) setDepartureDate(patch.departureDate); if (patch.airport !== undefined) setAirport(patch.airport); if (patch.note !== undefined) setDepartureNote(patch.note); }} /> : null}{error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>{t('journeys.detail.cancel')}</Button><Button type="submit" variant="primary" disabled={mutation.isPending}>{t('journeys.milestone.save')}</Button></div></form>;
}
