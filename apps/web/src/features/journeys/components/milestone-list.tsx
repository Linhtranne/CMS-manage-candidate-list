'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { deriveWaitingView } from '../domain/derive-journey-health';
import { MilestoneForm } from './milestone-form';
import { WaiveMilestoneDialog } from './waive-milestone-dialog';

type Journey = components['schemas']['SupplyJourneyDetail'];
type Milestone = components['schemas']['JourneyMilestone'];

const statusKeys: Record<Milestone['status'], 'journeys.milestone.statuses.notStarted' | 'journeys.milestone.statuses.inProgress' | 'journeys.milestone.statuses.completed' | 'journeys.milestone.statuses.blocked' | 'journeys.milestone.statuses.waived' | 'journeys.milestone.statuses.notApplicable'> = { NOT_STARTED: 'journeys.milestone.statuses.notStarted', IN_PROGRESS: 'journeys.milestone.statuses.inProgress', COMPLETED: 'journeys.milestone.statuses.completed', BLOCKED: 'journeys.milestone.statuses.blocked', WAIVED: 'journeys.milestone.statuses.waived', NOT_APPLICABLE: 'journeys.milestone.statuses.notApplicable' };
const statusTone: Record<Milestone['status'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = { NOT_STARTED: 'neutral', IN_PROGRESS: 'info', COMPLETED: 'success', BLOCKED: 'danger', WAIVED: 'warning', NOT_APPLICABLE: 'neutral' };

export function MilestoneList({ journey, canWaive }: { journey: Journey; canWaive: boolean }) {
  const { t, formatDate } = useI18n();
  const [editingId, setEditingId] = useState<string>();
  const [waiveMilestone, setWaiveMilestone] = useState<Milestone>();
  const [saved, setSaved] = useState(false);
  return <div className="space-y-3" aria-label={t('journeys.milestone.listAria')}>
    {saved ? <p role="status" className="rounded-control bg-[#e8f5ee] px-3 py-2 text-sm font-semibold text-success">{t('journeys.milestone.updated')}</p> : null}
    {journey.milestones.map((milestone) => {
      const waiting = deriveWaitingView(milestone);
      const waitingKey = waiting === 'WAITING_CANDIDATE' ? 'journeys.milestone.waiting.candidate' : waiting === 'WAITING_EXTERNAL' ? 'journeys.milestone.waiting.external' : 'journeys.milestone.waiting.blocked';
      return <article key={milestone.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('journeys.milestone.countLabel', { sequence: milestone.sequence })}</p><h3 className="mt-1 font-bold text-text">{getDomainLabel(t, 'milestoneName', milestone.name)}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><StatusLabel tone={statusTone[milestone.status]}>{t(statusKeys[milestone.status])}</StatusLabel>{waiting ? <StatusLabel tone="warning">{t(waitingKey)}</StatusLabel> : null}</div></div><div className="flex flex-wrap gap-2">{milestone.status !== 'COMPLETED' && milestone.status !== 'WAIVED' && <Button size="sm" variant="secondary" onClick={() => setEditingId(editingId === milestone.id ? undefined : milestone.id)}>{editingId === milestone.id ? t('journeys.milestone.closeUpdate') : t('journeys.milestone.update')}</Button>}{canWaive && milestone.status !== 'COMPLETED' && milestone.status !== 'WAIVED' && <Button size="sm" variant="secondary" onClick={() => setWaiveMilestone(milestone)}>{t('journeys.milestone.waive')}</Button>}</div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-text-muted">{t('journeys.milestone.due')}</dt><dd className="font-semibold text-text">{milestone.dueAt ? formatDate(milestone.dueAt) : t('journeys.milestone.noDue')}</dd></div><div><dt className="text-text-muted">{t('journeys.milestone.evidence')}</dt><dd className="font-semibold text-text">{t('journeys.milestone.evidenceCount', { completed: milestone.completedEvidenceCount, required: milestone.requiredEvidenceCount })}</dd></div><div><dt className="text-text-muted">{t('journeys.milestone.owner')}</dt><dd className="font-semibold text-text">{milestone.owner.name}</dd></div></dl>{milestone.blockerReason ? <p className="mt-3 rounded-control bg-[#fff3dc] px-3 py-2 text-sm text-warning">{t('journeys.milestone.blockerPrefix')}{milestone.blockerReason}</p> : null}{milestone.waiverReason ? <p className="mt-3 rounded-control bg-[#fff3dc] px-3 py-2 text-sm text-warning">{t('journeys.milestone.waiverPrefix')}{milestone.waiverReason}</p> : null}{editingId === milestone.id ? <div className="mt-4"><MilestoneForm journey={journey} milestone={milestone} onCancel={() => setEditingId(undefined)} onSaved={() => { setEditingId(undefined); setSaved(true); }} /></div> : null}</article>;
    })}
    {waiveMilestone ? <WaiveMilestoneDialog journeyId={journey.id} milestone={waiveMilestone} open onClose={() => setWaiveMilestone(undefined)} onSaved={() => setSaved(true)} /> : null}
  </div>;
}
