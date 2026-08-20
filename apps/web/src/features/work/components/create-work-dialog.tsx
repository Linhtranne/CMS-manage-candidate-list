'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateWorkItem } from '../services/work-queries';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';

type Candidate = components['schemas']['CandidateDetail'];
type Priority = components['schemas']['CreateWorkItemRequest']['priority'];

export function CreateWorkDialog({ candidate, open, onClose, onSaved }: { candidate: Candidate; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const mutation = useCreateWorkItem();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const reset = () => { setTitle(''); setPriority('NORMAL'); setDueAt(''); setNotes(''); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    if (!title.trim() || !dueAt) return;
    const application = candidate.applications[0];
    mutation.mutate({ title: title.trim(), priority, dueAt: new Date(dueAt).toISOString(), candidateId: candidate.id, orderId: application?.order.id ?? null, clientId: application?.client.id ?? null, notes: notes.trim() || null }, { onSuccess: () => { reset(); onSaved?.(); onClose(); } });
  };
  return <Modal open={open} title={t('work.create.title')} description={t('work.create.description')} onClose={close} confirmOnClose={Boolean(title.trim() || dueAt || notes.trim())} closeConfirmation={t('work.create.closeConfirmation')} size="md" footer={<><Button variant="secondary" onClick={close}>{t('common.actions.cancel')}</Button><Button variant="primary" disabled={mutation.isPending || !title.trim() || !dueAt} onClick={submit}>{mutation.isPending ? t('work.create.creating') : t('work.create.create')}</Button></>}><div className="space-y-4">{mutation.error ? <p role="alert" className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-3 text-sm font-semibold text-danger">{localizedError(t, mutation.error, t('work.errors.create'))}</p> : null}<div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted"><strong className="text-text">{candidate.code} · {candidate.name}</strong><p className="mt-1">{candidate.applications[0] ? `${candidate.applications[0].order.code} · ${candidate.applications[0].client.name}` : t('work.create.linkedRecord')}</p></div><label className="block text-sm font-semibold text-text">{t('work.create.titleLabel')}<input aria-label={t('work.create.titleLabel')} name="candidate-work-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('work.create.titlePlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-text">{t('work.create.priority')}<select aria-label={t('work.create.priority')} name="candidate-work-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="URGENT">{t('work.table.priorities.urgent')}</option><option value="HIGH">{t('work.table.priorities.high')}</option><option value="NORMAL">{t('work.table.priorities.normal')}</option></select></label><label className="block text-sm font-semibold text-text">{t('work.create.dueAt')}<input aria-label={t('work.create.dueAt')} name="candidate-work-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label></div><label className="block text-sm font-semibold text-text">{t('work.create.notes')}<textarea aria-label={t('work.create.notes')} name="candidate-work-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></div></Modal>;
}
