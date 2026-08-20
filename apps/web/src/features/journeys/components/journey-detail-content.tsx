'use client';

import { useEffect, useMemo, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useDetailTab } from '@/hooks/use-detail-tab';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';
import { occupationLabel } from '@/i18n/catalog-options';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useCreateWorkItem } from '@/features/work/services/work-queries';
import { MilestoneList } from './milestone-list';

type Journey = components['schemas']['SupplyJourneyDetail'];
type Evidence = components['schemas']['JourneyEvidence'];
type DetailTab = 'progress' | 'documents' | 'tasks' | 'email' | 'history';
type LocalTask = { id: string; title: string; dueAt: string | null; status: 'TODO' | 'DONE'; milestoneId?: string };

const tabs: Array<[DetailTab, 'journeys.detail.tabs.progress' | 'journeys.detail.tabs.documents' | 'journeys.detail.tabs.tasks' | 'journeys.detail.tabs.email' | 'journeys.detail.tabs.history']> = [
  ['progress', 'journeys.detail.tabs.progress'], ['documents', 'journeys.detail.tabs.documents'], ['tasks', 'journeys.detail.tabs.tasks'], ['email', 'journeys.detail.tabs.email'], ['history', 'journeys.detail.tabs.history']
];

function storageKey(journeyId: string, suffix: string) { return `cms-journey-${journeyId}-${suffix}`; }

export function JourneyDetailContent({ journey, compact = false }: { journey: Journey; compact?: boolean }) {
  const { t, formatDate, formatDateTime } = useI18n();
  const [tab, setTab] = useDetailTab<DetailTab>('progress');
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Array<{ id: string; text: string; createdAt: string }>>([]);
  const [evidence, setEvidence] = useState<Evidence[]>(journey.evidence);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const createWork = useCreateWorkItem();
  const currentUser = useCurrentUser();
  const canWaive = currentUser.data?.permissions.includes('journeys.waive') ?? false;
  const completed = journey.progress.completed;
  const percent = journey.progress.applicable ? Math.round((completed / journey.progress.applicable) * 100) : 0;
  const pendingMilestones = useMemo(() => journey.milestones.filter((milestone) => !['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status)), [journey.milestones]);
  const healthKey = journey.health === 'AT_RISK' ? 'journeys.detail.health.atRisk' : journey.health === 'OVERDUE' ? 'journeys.detail.health.overdue' : journey.health === 'COMPLETED' ? 'journeys.detail.health.completed' : 'journeys.detail.health.onTrack';
  const healthTone = journey.health === 'AT_RISK' ? 'danger' : journey.health === 'OVERDUE' ? 'warning' : journey.health === 'COMPLETED' ? 'neutral' : 'success';

  useEffect(() => {
    try {
      const savedNotes = window.localStorage.getItem(storageKey(journey.id, 'notes'));
      const savedEvidence = window.localStorage.getItem(storageKey(journey.id, 'evidence'));
      const savedTasks = window.localStorage.getItem(storageKey(journey.id, 'tasks'));
      if (savedNotes) setNotes(JSON.parse(savedNotes) as Array<{ id: string; text: string; createdAt: string }>);
      if (savedEvidence) setEvidence([...journey.evidence, ...(JSON.parse(savedEvidence) as Evidence[])]);
      if (savedTasks) setTasks(JSON.parse(savedTasks) as LocalTask[]);
    } catch {
      // Ignore malformed local demo state and render the server snapshot.
    } finally {
      setHydrated(true);
    }
  }, [journey.evidence, journey.id]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey(journey.id, 'notes'), JSON.stringify(notes));
    window.localStorage.setItem(storageKey(journey.id, 'evidence'), JSON.stringify(evidence.filter((item) => item.id.startsWith('local-'))));
    window.localStorage.setItem(storageKey(journey.id, 'tasks'), JSON.stringify(tasks));
  }, [evidence, hydrated, journey.id, notes, tasks]);

  const allTasks = useMemo<LocalTask[]>(() => [
    ...pendingMilestones.map((milestone) => ({ id: `milestone-task-${milestone.id}`, title: milestone.name, dueAt: milestone.dueAt, status: 'TODO' as const, milestoneId: milestone.id })),
    ...tasks
  ], [pendingMilestones, tasks]);

  const addTask = () => {
    if (!taskTitle.trim() || !taskDueAt) return;
    createWork.mutate({ title: taskTitle.trim(), priority: 'NORMAL', dueAt: new Date(taskDueAt).toISOString(), candidateId: journey.candidate.id, orderId: journey.order.id, clientId: journey.client.id, notes: `${t('journeys.list.title')} ${journey.id}` }, { onSuccess: (item) => { setTasks((current) => [...current, { id: item.id, title: taskTitle.trim(), dueAt: new Date(taskDueAt).toISOString(), status: 'TODO', milestoneId: journey.currentMilestone }]); setTaskTitle(''); setTaskDueAt(''); setTaskOpen(false); } });
  };

  const addEvidence = (file: File) => {
    setEvidence((current) => [...current, { id: `local-evidence-${Date.now()}`, milestoneId: journey.milestones[0]?.id ?? '', fileName: file.name, scanStatus: 'PENDING', uploadedAt: new Date().toISOString(), uploadedBy: currentUser.data ? { id: currentUser.data.id, name: currentUser.data.displayName } : { id: 'current-user', name: t('journeys.detail.currentUser') }, downloadUrl: null }]);
  };

  return <div className="space-y-5">
    <header className="rounded-lg border border-border bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-accent">{journey.candidate.code}</p><h1 className={`${compact ? 'text-xl' : 'text-2xl'} mt-1 font-bold text-text`}>{journey.candidate.name}</h1><p className="mt-2 text-sm text-text-muted">{journey.order.code} · {occupationLabel(t, journey.order.position)} · {journey.client.name}</p></div><div className="flex flex-wrap items-center gap-2"><StatusLabel tone={healthTone}>{t(healthKey)}</StatusLabel><span className="text-sm text-text-muted">{t('journeys.detail.owner')}: {journey.owner.name}</span></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-4"><div><p className="text-xs uppercase tracking-wide text-text-muted">{t('journeys.detail.template')}</p><p className="mt-1 font-semibold text-text">{getDomainLabel(t, 'journeyTemplate', journey.templateName)}</p><p className="text-xs text-text-muted">{t('journeys.detail.version', { version: journey.templateVersion })}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">{t('journeys.detail.currentMilestone')}</p><p className="mt-1 font-semibold text-text">{getDomainLabel(t, 'milestoneName', journey.currentMilestone)}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">{t('journeys.detail.progress')}</p><p className="mt-1 font-semibold text-text">{t('journeys.detail.progressCount', { completed, applicable: journey.progress.applicable, percent })}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">{t('journeys.detail.nearestDue')}</p><p className="mt-1 font-semibold text-text">{journey.nearestDueAt ? formatDate(journey.nearestDueAt) : t('journeys.detail.noDue')}</p></div></div>
    </header>
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label={t('journeys.detail.tabsLabel')} role="tablist">{tabs.map(([id, key]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 border-b-2 px-3 text-sm font-semibold ${tab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}>{t(key)}</button>)}</nav>
    {tab === 'progress' ? <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-text">{t('journeys.detail.milestonesTitle')}</h2><p className="mt-1 text-sm text-text-muted">{t('journeys.detail.milestonesDescription')}</p></div><Button variant="secondary" size="sm" onClick={() => { setNote(''); setNoteOpen(true); }}>{t('journeys.detail.addNote')}</Button></div>{notes.length ? <section className="mb-4 rounded-lg border border-border bg-panel p-4"><h3 className="text-sm font-bold text-text">{t('journeys.detail.notesTitle')}</h3><ul className="mt-3 space-y-3">{notes.map((item) => <li key={item.id} className="border-l-2 border-accent pl-3"><p className="text-sm text-text">{item.text}</p><p className="mt-1 text-xs text-text-muted">{t('journeys.detail.noteDateBy', { date: formatDateTime(item.createdAt), name: currentUser.data?.displayName ?? t('journeys.detail.currentUser') })}</p></li>)}</ul></section> : <p className="mb-4 rounded-lg border border-dashed border-border p-3 text-sm text-text-muted">{t('journeys.detail.noteEmpty')}</p>}<MilestoneList journey={journey} canWaive={canWaive} /></section> : null}
    {tab === 'documents' ? <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text">{t('journeys.detail.documentsTitle')}</h2><p className="mt-1 text-sm text-text-muted">{t('journeys.detail.documentsDescription')}</p></div><label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]">{t('journeys.detail.addFile')}<input className="sr-only" type="file" name="journey-files" aria-label={t('journeys.detail.addFileAria')} onChange={(event) => { const file = event.target.files?.[0]; if (file) addEvidence(file); event.currentTarget.value = ''; }} /></label></div>{evidence.length ? <ul className="mt-4 divide-y divide-border">{evidence.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-text">{item.fileName}</p><p className="text-xs text-text-muted">{t('journeys.detail.uploadedBy', { name: item.uploadedBy.name, date: formatDateTime(item.uploadedAt) })}</p></div><div className="flex items-center gap-3"><StatusLabel tone={item.scanStatus === 'SAFE' ? 'success' : item.scanStatus === 'QUARANTINED' || item.scanStatus === 'REJECTED' ? 'danger' : 'warning'}>{t(item.scanStatus === 'SAFE' ? 'journeys.detail.scan.safe' : item.scanStatus === 'QUARANTINED' ? 'journeys.detail.scan.quarantined' : item.scanStatus === 'REJECTED' ? 'journeys.detail.scan.rejected' : 'journeys.detail.scan.pending')}</StatusLabel>{item.downloadUrl ? <a href={item.downloadUrl} className="text-sm font-semibold text-accent underline">{t('journeys.detail.download')}</a> : <span className="text-xs text-text-muted">{t('journeys.detail.pendingFile')}</span>}</div></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">{t('journeys.detail.noEvidence')}</p>}</section> : null}
    {tab === 'tasks' ? <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text">{t('journeys.detail.tasksTitle')}</h2><p className="mt-1 text-sm text-text-muted">{t('journeys.detail.tasksDescription')}</p></div><Button variant="primary" size="sm" onClick={() => setTaskOpen(true)}>{t('journeys.detail.addTask')}</Button></div>{allTasks.length ? <ul className="mt-4 space-y-3">{allTasks.map((task) => <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"><label className="flex items-start gap-3"><input type="checkbox" name={`journey-task-${task.id}`} aria-label={t('journeys.detail.taskAria', { title: task.title })} checked={task.status === 'DONE'} onChange={() => { if (task.id.startsWith('local-')) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: item.status === 'DONE' ? 'TODO' : 'DONE' } : item)); }} disabled={!task.id.startsWith('local-')} className="mt-1 size-4 accent-[#2865ad]" /><span><span className={`font-semibold ${task.status === 'DONE' ? 'text-text-muted line-through' : 'text-text'}`}>{task.title}</span>{task.dueAt ? <span className="mt-1 block text-xs text-text-muted">{t('journeys.detail.taskDue', { date: formatDateTime(task.dueAt) })}</span> : null}</span></label><StatusLabel tone={task.status === 'DONE' ? 'success' : 'warning'}>{t(task.status === 'DONE' ? 'journeys.detail.done' : 'journeys.detail.todo')}</StatusLabel></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">{t('journeys.detail.noTasks')}</p>}</section> : null}
    {tab === 'email' ? <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">{t('journeys.detail.emailTitle')}</h2><p className="mt-3 text-sm text-text-muted">{t('journeys.detail.emailDescription')}</p><a className="mt-4 inline-flex min-h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-accent" href={`/mailbox?journeyId=${journey.id}`}>{t('journeys.detail.openMailbox')}</a></section> : null}
    {tab === 'history' ? <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">{t('journeys.detail.historyTitle')}</h2>{journey.history.length ? <ol className="mt-4 space-y-4">{journey.history.map((event) => <li key={event.id} className="border-l-2 border-accent pl-4"><p className="text-sm font-semibold text-text">{event.summary}</p><p className="mt-1 text-xs text-text-muted">{formatDateTime(event.occurredAt)} · {event.actor.name}</p></li>)}</ol> : <p className="mt-4 text-sm text-text-muted">{t('journeys.detail.noHistory')}</p>}</section> : null}
    <Modal open={noteOpen} title={t('journeys.detail.noteModalTitle')} description={t('journeys.detail.noteModalDescription')} onClose={() => setNoteOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={() => setNoteOpen(false)}>{t('journeys.detail.cancel')}</Button><Button variant="primary" disabled={!note.trim()} onClick={() => { setNotes((current) => [...current, { id: `note-${Date.now()}`, text: note.trim(), createdAt: new Date().toISOString() }]); setNoteOpen(false); }}>{t('journeys.detail.saveNote')}</Button></>}><label className="block text-sm font-semibold text-text">{t('journeys.detail.noteContent')}<textarea aria-label={t('journeys.detail.noteContentAria')} name="journey-note-content" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-32 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></Modal>
    <Modal open={taskOpen} title={t('journeys.detail.taskModalTitle')} description={t('journeys.detail.taskModalDescription')} onClose={() => setTaskOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={() => setTaskOpen(false)}>{t('journeys.detail.cancel')}</Button><Button variant="primary" disabled={createWork.isPending || !taskTitle.trim() || !taskDueAt} onClick={addTask}>{createWork.isPending ? t('journeys.detail.creating') : t('journeys.detail.addTask')}</Button></>}><div className="space-y-4">{createWork.error ? <p role="alert" className="text-sm font-semibold text-danger">{localizedError(t, createWork.error, t('journeys.detail.createError'))}</p> : null}<label className="block text-sm font-semibold text-text">{t('journeys.detail.taskName')}<input aria-label={t('journeys.detail.taskNameAria')} name="journey-task-name" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t('journeys.detail.taskPlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">{t('journeys.detail.dueAt')}<input aria-label={t('journeys.detail.dueAtAria')} name="journey-task-due" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label></div></Modal>
  </div>;
}
