'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { deriveApplicationStage } from '../domain/derive-application-stage';
import { catalogLabel, occupationLabel } from '@/i18n/catalog-options';
import { useCreateEntityNote, useEntityNotes } from '@/features/shared/entity-notes';
import { useCandidate } from '@/features/candidates/services/candidate-queries';
import { useUploadCandidateDocument } from '@/features/shared/document-uploads';
import { timeZoneLabel } from '@/i18n/time-zone-label';
import { getDomainLabel } from '@/i18n/domain-labels';

type Application = components['schemas']['ApplicationDetail'];
export const applicationTabs = [
  { id: 'overview', key: 'applications.profile.tabs.overview' },
  { id: 'interviews', key: 'applications.profile.tabs.interviews' },
  { id: 'result', key: 'applications.profile.tabs.result' },
  { id: 'files', key: 'applications.profile.tabs.files' },
  { id: 'history', key: 'applications.profile.tabs.history' },
] as const;
export type ApplicationTab = (typeof applicationTabs)[number]['id'];
const stageKeys = {
  NEWLY_MATCHED: 'applications.table.stageNew',
  WAITING_INTERVIEW: 'applications.table.stageWaitingInterview',
  WAITING_RESULT: 'applications.table.stageWaitingResult',
  INTERVIEWED: 'applications.table.stageInterviewed',
  PASSED: 'applications.table.stagePassed',
  FAILED: 'applications.table.stageFailed',
  WITHDRAWN: 'applications.table.stageWithdrawn',
} as const;

function historySummary(
  t: ReturnType<typeof useI18n>['t'],
  event: Application['history'][number],
): string {
  const from = typeof event.metadata?.fromStatus === 'string' ? event.metadata.fromStatus : undefined;
  const to = typeof event.metadata?.toStatus === 'string' ? event.metadata.toStatus : undefined;
  if (event.type === 'STATUS_CHANGED' && from && to) {
    return t('applications.profile.historyStatusChanged', {
      from: getDomainLabel(t, 'applicationStatus', from),
      to: getDomainLabel(t, 'applicationStatus', to),
    });
  }
  const resultMatch = /^Ghi kết quả (PENDING|ADVANCE_NEXT_ROUND|PASS|FAIL)\.$/.exec(event.summary);
  if (resultMatch) {
    const result = resultMatch[1] === 'PENDING'
      ? t('applications.profile.pending')
      : resultMatch[1] === 'ADVANCE_NEXT_ROUND'
        ? t('applications.profile.advanceNextRound')
        : resultMatch[1] === 'PASS'
          ? t('applications.profile.pass')
          : t('applications.profile.fail');
    return t('applications.profile.historyResultRecorded', { result });
  }
  return event.summary;
}
function stageTone(stage: ReturnType<typeof deriveApplicationStage>) {
  if (stage === 'PASSED') return 'success' as const;
  if (stage === 'FAILED' || stage === 'WITHDRAWN') return 'danger' as const;
  return 'info' as const;
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-text">{value}</dd>
    </div>
  );
}

function Overview({ application }: { application: Application }) {
  const { t, formatDate, formatDateTime } = useI18n();
  const stage = deriveApplicationStage(application, application.interviews);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-panel p-5">
        <h3 className="font-bold text-text">{t('applications.profile.overview')}</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoRow
            label={t('applications.profile.candidateCode')}
            value={application.candidate.code}
          />
          <InfoRow label={t('applications.profile.candidate')} value={application.candidate.name} />
          <InfoRow
            label={t('applications.profile.order')}
            value={`${application.order.code} · ${occupationLabel(t, application.order.position)}`}
          />
          <InfoRow label={t('applications.profile.client')} value={application.client.name} />
          <InfoRow
            label={t('applications.profile.source')}
            value={catalogLabel(t, application.source)}
          />
          <InfoRow label={t('applications.profile.owner')} value={application.owner.name} />
        </dl>
      </section>
      <section className="rounded-lg border border-border bg-panel p-5">
        <h3 className="font-bold text-text">{t('applications.profile.progress')}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusLabel tone={stageTone(stage)}>{t(stageKeys[stage])}</StatusLabel>
          <StatusLabel tone="neutral">
            {t('applications.profile.interviews', { count: application.interviews.length })}
          </StatusLabel>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoRow
            label={t('applications.profile.appliedAt')}
            value={formatDate(application.appliedAt, { dateStyle: 'short' })}
          />
          <InfoRow
            label={t('applications.profile.lastActivity')}
            value={formatDateTime(application.lastActivityAt)}
          />
          <InfoRow
            label={t('applications.profile.dueAt')}
            value={
              application.dueAt
                ? formatDateTime(application.dueAt)
                : t('applications.profile.noDue')
            }
          />
          <InfoRow label={t('applications.profile.version')} value={String(application.version)} />
        </dl>
      </section>
      <section className="rounded-lg border border-border bg-panel p-5 lg:col-span-2">
        <h3 className="font-bold text-text">{t('applications.profile.next')}</h3>
      </section>
    </div>
  );
}

function Interviews({
  application,
  onReschedule,
  onCancelInterview,
  onNoShow,
}: {
  application: Application;
  onReschedule?: (interview: Application['interviews'][number]) => void;
  onCancelInterview?: (interview: Application['interviews'][number]) => void;
  onNoShow?: (interview: Application['interviews'][number]) => void;
}) {
  const { t, formatDateTime } = useI18n();
  if (!application.interviews.length)
    return (
      <EmptyState
        title={t('applications.profile.noInterviews')}

      />
    );
  return (
    <div className="space-y-4">
      {application.interviews.map((item) => (
        <article key={item.id} className="rounded-lg border border-border bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-accent">
                {t('applications.profile.round', { round: item.round })}
              </p>
              <h3 className="mt-1 font-bold text-text">{formatDateTime(item.scheduledAt)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusLabel
                tone={
                  item.scheduleStatus === 'COMPLETED'
                    ? 'success'
                    : item.scheduleStatus === 'CANCELLED'
                      ? 'danger'
                      : 'warning'
                }
              >
                {item.scheduleStatus === 'SCHEDULED'
                  ? t('applications.profile.scheduled')
                  : item.scheduleStatus === 'COMPLETED'
                    ? t('applications.profile.completed')
                    : item.scheduleStatus === 'DRAFT'
                      ? t('applications.profile.draft')
                      : item.scheduleStatus === 'CANCELLED'
                        ? t('applications.profile.cancelled')
                        : item.scheduleStatus === 'NO_SHOW'
                          ? t('applications.profile.noShow')
                          : t('common.states.unknown')}
              </StatusLabel>
              <StatusLabel tone="neutral">
                {item.result === 'PENDING'
                  ? t('applications.profile.pending')
                  : item.result === 'ADVANCE_NEXT_ROUND'
                    ? t('applications.profile.advanceNextRound')
                  : item.result === 'PASS'
                    ? t('applications.profile.pass')
                    : t('applications.profile.fail')}
              </StatusLabel>
              {item.scheduleStatus === 'SCHEDULED' && (
                <>
                  <button
                    type="button"
                    className="text-sm font-semibold text-accent"
                    onClick={() => onReschedule?.(item)}
                  >
                    {t('applications.profile.reschedule')}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger"
                    onClick={() => onCancelInterview?.(item)}
                  >
                    {t('applications.profile.cancelInterview')}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger"
                    onClick={() => onNoShow?.(item)}
                  >
                    {t('applications.profile.markNoShow')}
                  </button>
                </>
              )}
            </div>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <InfoRow
              label={t('applications.profile.mode')}
              value={
                item.mode === 'ONLINE'
                  ? t('applications.profile.online')
                  : t('applications.profile.inPerson')
              }
            />
            <InfoRow label={t('applications.profile.timeZone')} value={timeZoneLabel(t, item.timeZone)} />
            <InfoRow
              label={t('applications.profile.participants')}
              value={item.participants.map((participant) => participant.name).join(', ')}
            />
          </dl>
          {item.feedback && (
            <p className="mt-4 rounded-control bg-surface p-3 text-sm text-text-muted">
              {item.feedback}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function FilesAndNotes({ application }: { application: Application }) {
  const { t } = useI18n();
  const candidateQuery = useCandidate(application.candidate.id);
  const uploadDocument = useUploadCandidateDocument();
  const [fileError, setFileError] = useState('');
  const files = candidateQuery.data?.files ?? [];
  const notesQuery = useEntityNotes('APPLICATION', application.id);
  const createNote = useCreateEntityNote();
  const notes = notesQuery.data?.items.map((item) => item.content) ?? application.notes ?? [];
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const addFile = (file: File) => {
    setFileError('');
    uploadDocument.mutate({ candidateId: application.candidate.id, file }, { onError: (cause) => setFileError(cause instanceof Error ? cause.message : t('common.errors.loadFailed')) });
  };
  const addNote = () => {
    if (!noteDraft.trim()) return;
    createNote.mutate({ entityType: 'APPLICATION', entityId: application.id, content: noteDraft.trim() }, { onSuccess: () => { setNoteDraft(''); setNoteOpen(false); } });
  };
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-text">{t('applications.profile.filesTitle')}</h3>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white">
            {t('applications.profile.addFile')}
            <input
              className="sr-only"
              type="file"
              name="application-files"
              aria-label={t('applications.profile.addFile')}
              multiple
              disabled={uploadDocument.isPending}
              onChange={(event) => {
                for (const file of Array.from(event.target.files ?? [])) addFile(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
        {files.length ? (
          <ul className="mt-4 space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-3"
              >
                <span className="font-semibold text-text">{file.fileName}</span>
                <StatusLabel tone={file.scanStatus === 'SAFE' ? 'success' : file.scanStatus === 'REJECTED' || file.scanStatus === 'QUARANTINED' ? 'danger' : 'warning'}>{file.scanStatus === 'SAFE' ? t('candidates.detail.files.safe') : t('applications.profile.checking')}</StatusLabel>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={t('applications.profile.noFiles')}
          />
        )}
        {fileError ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{fileError}</p> : null}
      </section>
      <section className="rounded-lg border border-border bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-text">{t('applications.profile.notes')}</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNoteDraft('');
              setNoteOpen(true);
            }}
          >
            {t('applications.profile.addNote')}
          </Button>
        </div>
        {notes.length ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-muted">{t('applications.profile.noNotes')}</p>
        )}
      </section>
      <Modal
        open={noteOpen}
        title={t('applications.profile.noteTitle')}
        onClose={() => setNoteOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="primary" disabled={!noteDraft.trim()} onClick={addNote}>
              {t('applications.profile.saveNote')}
            </Button>
          </>
        }
      >
        <label className="block text-sm font-semibold text-text">
          {t('applications.profile.noteContent')}
          <textarea
            aria-label={t('applications.profile.noteAria')}
            name="application-note"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mt-1 min-h-28 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal"
          />
        </label>
      </Modal>
    </div>
  );
}

export function ApplicationProfileContent({
  application,
  activeTab,
  onTabChange,
  actions,
}: {
  application: Application;
  activeTab: ApplicationTab;
  onTabChange: (tab: ApplicationTab) => void;
  actions?: {
    onSchedule?: () => void;
    onResult?: () => void;
    onDecision?: () => void;
    onJourney?: () => void;
    onReschedule?: (interview: Application['interviews'][number]) => void;
    onCancelInterview?: (interview: Application['interviews'][number]) => void;
    onNoShow?: (interview: Application['interviews'][number]) => void;
  };
}) {
  const { t, formatDateTime } = useI18n();
  const stage = deriveApplicationStage(application, application.interviews);
  const history = application.history ?? [];
  const displayCode = `HS-${application.id.slice(-6).toUpperCase()}`;
  const handleTabKeyDown = useTabKeyboard(
    applicationTabs.map(({ id }) => id),
    (value) => onTabChange(value as ApplicationTab),
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">
            {t('applications.profile.applicationCode', { code: displayCode })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">
            {application.candidate.name}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {application.order.code} · {occupationLabel(t, application.order.position)} ·{' '}
            {application.client.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusLabel tone={stageTone(stage)}>{t(stageKeys[stage])}</StatusLabel>
            <StatusLabel tone="neutral">
              {t('applications.profile.owner')}: {application.owner.name}
            </StatusLabel>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-10 rounded-control bg-accent px-4 text-sm font-semibold text-white"
            onClick={actions?.onSchedule}
          >
            {t('applications.profile.schedule')}
          </button>
          <button
            type="button"
            className="min-h-10 rounded-control border border-border bg-panel px-4 text-sm font-semibold text-text"
            onClick={actions?.onResult}
          >
            {t('applications.profile.enterResult')}
          </button>
          <button
            type="button"
            className="min-h-10 rounded-control border border-border bg-panel px-4 text-sm font-semibold text-text"
            onClick={actions?.onDecision}
          >
            {t('applications.profile.decision')}
          </button>
          {stage === 'PASSED' && (
            <button
              type="button"
              className="min-h-10 rounded-control border border-accent bg-panel px-4 text-sm font-semibold text-accent"
              onClick={actions?.onJourney}
            >
              {t('applications.profile.startJourney')}
            </button>
          )}
        </div>
      </header>
      <nav
        className="-mx-1 overflow-x-auto border-b border-border"
        aria-label={t('applications.profile.tabLabel')}
        role="tablist"
        onKeyDown={handleTabKeyDown}
      >
        <div className="flex min-w-max gap-1 px-1">
          {applicationTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-value={tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}
            >
              {t(tab.key as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </nav>
      {activeTab === 'overview' && <Overview application={application} />}
      {activeTab === 'interviews' && (
        <Interviews
          application={application}
          onReschedule={actions?.onReschedule}
          onCancelInterview={actions?.onCancelInterview}
          onNoShow={actions?.onNoShow}
        />
      )}
      {activeTab === 'result' && (
        <section className="rounded-lg border border-border bg-panel p-5">
          <h3 className="font-bold text-text">{t('applications.profile.resultTitle')}</h3>
          {application.decisionReason && (
            <p className="mt-4 rounded-control bg-surface p-3 text-sm text-text">
              {t('applications.profile.reasonLabel')}: {application.decisionReason}
            </p>
          )}
        </section>
      )}
      {activeTab === 'files' && <FilesAndNotes application={application} />}
      {activeTab === 'history' && (
        <section className="rounded-lg border border-border bg-panel p-5">
          <h3 className="font-bold text-text">{t('applications.profile.historyTitle')}</h3>
          {history.length ? (
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {history.map((event) => (
                <li key={event.id}>
                  <p className="font-semibold text-text">{historySummary(t, event)}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {formatDateTime(event.occurredAt)} · {event.actor.name}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title={t('applications.profile.noHistory')}

            />
          )}
        </section>
      )}
    </div>
  );
}
