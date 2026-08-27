'use client';

import { type ReactNode, useState } from 'react';
import { useDetailTab } from '@/hooks/use-detail-tab';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import { useCandidate } from '../services/candidate-queries';
import { CandidateEditModal } from './candidate-edit-modal';
import { candidatePhaseLabel } from './candidate-table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { catalogLabel, occupationLabel } from '@/i18n/catalog-options';
import { getDomainLabel } from '@/i18n/domain-labels';
import { AddOccupationProfileModal } from './add-occupation-profile-modal';
import { useCreateEntityNote, useEntityNotes } from '@/features/shared/entity-notes';
import { useDownloadDocument, useUploadCandidateDocument } from '@/features/shared/document-uploads';

const tabs = [
  ['overview', 'candidates.detail.tabs.overview'],
  ['applications', 'candidates.detail.tabs.applications'],
  ['journeys', 'candidates.detail.tabs.journeys'],
  ['work', 'candidates.detail.tabs.work'],
  ['email', 'candidates.detail.tabs.email'],
  ['files', 'candidates.detail.tabs.files'],
  ['history', 'candidates.detail.tabs.history'],
] as const;
export type CandidateTab = (typeof tabs)[number][0];
type Candidate = NonNullable<ReturnType<typeof useCandidate>['data']>;

function InfoRow({
  label,
  value,
  fallback,
}: {
  label: string;
  value?: string | null;
  fallback: string;
}) {
  const { t } = useI18n();
  const localized = occupationLabel(t, catalogLabel(t, value));
  return (
    <div>
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-text">{localized || fallback}</dd>
    </div>
  );
}

function OverviewTab({ candidate }: { candidate: Candidate }) {
  const { t } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);
  const fallback = t('candidates.drawer.notUpdated');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-panel p-5">
        <h2 className="font-bold text-text">{t('candidates.detail.overview.profile')}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoRow
            label={t('candidates.detail.overview.code')}
            value={candidate.code}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.name')}
            value={candidate.name}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.industry')}
            value={candidate.industryLabels.map((value) => catalogLabel(t, value)).join(', ')}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.occupation')}
            value={occupationLabel(t, candidate.occupation)}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.japanese')}
            value={catalogLabel(t, candidate.japaneseLevel)}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.source')}
            value={catalogLabel(t, candidate.source)}
            fallback={fallback}
          />
        </dl>
      </section>
      <section className="rounded-lg border border-border bg-panel p-5">
        <h2 className="font-bold text-text">{t('candidates.detail.overview.contactOwner')}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoRow
            label={t('candidates.form.email')}
            value={candidate.email ?? candidate.emailMasked}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.drawer.phone')}
            value={candidate.phone ?? candidate.phoneMasked}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.detail.overview.area')}
            value={candidate.address}
            fallback={fallback}
          />
          <InfoRow
            label={t('candidates.drawer.owner')}
            value={candidate.owner.name}
            fallback={fallback}
          />
        </dl>
        <div className="mt-5 rounded-control border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">{t('candidates.detail.overview.next')}</p>
          <p className="mt-1 font-semibold text-accent">
            {getDomainLabel(t, 'candidateNextAction', candidate.nextAction)}
          </p>
        </div>
      </section>
      <section className="rounded-lg border border-border bg-panel p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-text">{t('candidates.detail.overview.multiIndustry')}</h2><Button variant="secondary" size="sm" onClick={() => setProfileOpen(true)}>{t('candidates.detail.overview.addProfile')}</Button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {candidate.occupationProfiles.map((profile) => (
            <div
              key={`${profile.industryLabel}-${profile.occupation}`}
              className="rounded-control border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-text">{occupationLabel(t, profile.occupation)}</p>
                <StatusLabel tone={profile.status === 'PRIMARY' ? 'info' : 'neutral'}>
                  {catalogLabel(t, profile.industryLabel)}
                </StatusLabel>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {t('candidates.detail.overview.years', { count: profile.yearsExperience })}
              </p>
              <p className="mt-2 text-sm text-text-muted">
                {profile.skills.join(', ') || t('candidates.detail.overview.noSkills')}
              </p>
            </div>
          ))}
        </div>
        <AddOccupationProfileModal candidateId={candidate.id} open={profileOpen} onClose={() => setProfileOpen(false)} />
      </section>
    </div>
  );
}

function ApplicationsTab({ candidate }: { candidate: Candidate }) {
  const { t, formatDateTime } = useI18n();
  if (!candidate.applications.length)
    return (
      <EmptyState
        title={t('candidates.detail.applications.emptyTitle')}

      />
    );
  return (
    <div className="space-y-3">
      {candidate.applications.map((application) => (
        <section key={application.id} className="rounded-lg border border-border bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-text">
                {application.order.code} · {occupationLabel(t, application.order.position)}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {application.client.name} · {t('candidates.detail.applications.owner')}{' '}
                {application.owner.name}
              </p>
            </div>
            <StatusLabel
              tone={
                application.status === 'PASSED'
                  ? 'success'
                  : application.status === 'FAILED' || application.status === 'WITHDRAWN'
                    ? 'danger'
                    : 'info'
              }
            >
              {getDomainLabel(t, 'applicationStatus', application.status)}
            </StatusLabel>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            {t('candidates.detail.applications.lastUpdated')}{' '}
            {formatDateTime(application.lastActivityAt)}
          </p>
        </section>
      ))}
    </div>
  );
}

function JourneysTab({ candidate }: { candidate: Candidate }) {
  const { t } = useI18n();
  if (!candidate.journeys.length)
    return (
      <EmptyState
        title={t('candidates.detail.journeys.emptyTitle')}

      />
    );
  return (
    <div className="space-y-3">
      {candidate.journeys.map((journey) => (
        <section key={journey.id} className="rounded-lg border border-border bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-text">
                {getDomainLabel(t, 'journeyTemplate', journey.templateName)}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {journey.order.code} · {journey.client.name}
              </p>
            </div>
            <StatusLabel
              tone={
                journey.health === 'AT_RISK'
                  ? 'warning'
                  : journey.status === 'COMPLETED'
                    ? 'success'
                    : 'info'
              }
            >
              {getDomainLabel(t, 'milestoneName', journey.currentMilestone)}
            </StatusLabel>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            {t('candidates.detail.journeys.progress', {
              completed: journey.progress.completed,
              applicable: journey.progress.applicable,
            })}{' '}
            · {t('candidates.detail.journeys.owner')} {journey.owner.name}
          </p>
        </section>
      ))}
    </div>
  );
}

function SecondaryTab({
  tab,
  candidate,
}: {
  tab: Exclude<CandidateTab, 'overview' | 'applications' | 'journeys'>;
  candidate: Candidate;
}) {
  const { t, formatDateTime } = useI18n();
  const files = candidate.files;
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const notesQuery = useEntityNotes('CANDIDATE', candidate.id);
  const createNote = useCreateEntityNote();
  const uploadDocument = useUploadCandidateDocument();
  const downloadDocument = useDownloadDocument();
  const [fileError, setFileError] = useState('');
  const notes = notesQuery.data?.items.map((note) => note.content) ?? candidate.notes;
  const addNote = () => {
    if (!noteDraft.trim()) return;
    createNote.mutate({ entityType: 'CANDIDATE', entityId: candidate.id, content: noteDraft.trim() }, { onSuccess: () => { setNoteDraft(''); setNoteOpen(false); } });
  };
  const addFile = (file: File) => {
    setFileError('');
    uploadDocument.mutate({ candidateId: candidate.id, file }, { onError: (cause) => setFileError(cause instanceof Error ? cause.message : t('common.errors.loadFailed')) });
  };
  const downloadFile = (documentId: string) => {
    setFileError('');
    downloadDocument.mutate(documentId, { onError: (cause) => setFileError(cause instanceof Error ? cause.message : t('common.errors.loadFailed')) });
  };
  if (tab === 'work')
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-text">{t('candidates.detail.work.title')}</h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNoteDraft('');
              setNoteOpen(true);
            }}
          >
            {t('candidates.detail.work.addNote')}
          </Button>
        </div>
        {notes.length ? (
          <ul className="space-y-2">
            {notes.map((note, index) => (
              <li
                key={`${note}-${index}`}
                className="rounded-lg border border-border bg-panel p-4 text-sm text-text"
              >
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={t('candidates.detail.work.emptyTitle')}

          />
        )}
        <Modal
          open={noteOpen}
          title={t('candidates.detail.work.noteTitle')}
          onClose={() => setNoteOpen(false)}
          size="sm"
          footer={
            <>
              <Button onClick={() => setNoteOpen(false)}>{t('common.actions.cancel')}</Button>
              <Button variant="primary" disabled={!noteDraft.trim()} onClick={addNote}>
                {t('candidates.detail.work.save')}
              </Button>
            </>
          }
        >
          <label className="block text-sm font-semibold text-text">
            {t('candidates.detail.work.content')}
            <textarea
              aria-label={t('candidates.detail.work.contentAria')}
              name="candidate-note"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              className="mt-1 min-h-28 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal"
            />
          </label>
        </Modal>
      </section>
    );
  if (tab === 'email')
    return (
      <section className="rounded-lg border border-border bg-panel p-5">
        <h2 className="font-bold text-text">{t('candidates.detail.email.title')}</h2>
        <a
          href={`/mailbox?query=${encodeURIComponent(candidate.name)}`}
          className="mt-4 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]"
        >
          {t('candidates.detail.email.open')}
        </a>
      </section>
    );
  if (tab === 'files')
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-text">{t('candidates.detail.files.title')}</h2>
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white">
              {t('candidates.detail.files.add')}
              <input
                className="sr-only"
                type="file"
                name="candidate-files"
                aria-label={t('candidates.detail.files.addAria')}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) addFile(file);
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
                  <div className="flex items-center gap-3">
                    <StatusLabel
                      tone={
                        file.scanStatus === 'SAFE'
                          ? 'success'
                          : file.scanStatus === 'QUARANTINED' || file.scanStatus === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {file.scanStatus === 'SAFE'
                        ? t('candidates.detail.files.safe')
                        : t('candidates.detail.files.checking')}
                    </StatusLabel>
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        className="text-sm font-semibold text-accent underline"
                      >
                        {t('candidates.detail.files.download')}
                      </a>
                    ) : file.scanStatus === 'SAFE' ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-accent underline disabled:cursor-wait disabled:opacity-60"
                        disabled={downloadDocument.isPending}
                        onClick={() => downloadFile(file.id)}
                      >
                        {t('candidates.detail.files.download')}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">{t('candidates.detail.files.empty')}</p>
          )}
          {fileError ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{fileError}</p> : null}
        </section>
        <section className="rounded-lg border border-border bg-panel p-5">
          <h2 className="font-bold text-text">{t('candidates.detail.files.notes')}</h2>
          {notes.length ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">{t('candidates.detail.files.noNotes')}</p>
          )}
        </section>
      </div>
    );
  return (
    <section className="rounded-lg border border-border bg-panel p-5">
      <h2 className="font-bold text-text">{t('candidates.detail.history.title')}</h2>
      <ol className="mt-4 space-y-4 border-l border-border pl-5">
        {candidate.history.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent" />
            <p className="font-semibold text-text">{event.summary}</p>
            <p className="mt-1 text-sm text-text-muted">
              {formatDateTime(event.occurredAt)} · {event.actor.name}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CandidateProfileContent({
  candidate,
  activeTab,
  onTabChange,
  onEdit,
  actions,
}: {
  candidate: Candidate;
  activeTab: CandidateTab;
  onTabChange: (tab: CandidateTab) => void;
  onEdit?: () => void;
  actions?: ReactNode;
}) {
  const { t, formatDateTime } = useI18n();
  const handleTabKeyDown = useTabKeyboard(
    tabs.map(([id]) => id),
    (value) => onTabChange(value as CandidateTab),
  );
  const phaseKey = candidatePhaseLabel(candidate.operationalPhase) as Parameters<typeof t>[0];
  return (
    <div
      data-testid="candidate-profile-layout"
      data-profile-layout="candidate"
      className="candidate-profile-content mx-auto w-full max-w-[72rem] min-w-0 space-y-6"
    >
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">{candidate.code}</p>
          <h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{candidate.name}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {occupationLabel(t, candidate.occupation)} ·{' '}
            {candidate.industryLabels.map((value) => catalogLabel(t, value)).join(', ')} ·{' '}
            {t('candidates.drawer.owner')} {candidate.owner.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusLabel tone="info">
              {candidate.operationalPhase === 'POTENTIAL'
                ? t('candidates.detail.phasePotential')
                : t(phaseKey)}
            </StatusLabel>
            <StatusLabel tone={candidate.recordStatus === 'ACTIVE' ? 'success' : 'neutral'}>
              {candidate.recordStatus === 'ACTIVE'
                ? t('candidates.detail.active')
                : t('candidates.detail.archived')}
            </StatusLabel>
            <StatusLabel tone={candidate.contactabilityStatus === 'CONTACTABLE' ? 'success' : 'warning'}>
              {candidate.contactabilityStatus === 'CONTACTABLE'
                ? t('candidates.drawer.contactable')
                : candidate.contactabilityStatus === 'DO_NOT_CONTACT'
                  ? t('candidates.drawer.doNotContact')
                  : t('candidates.drawer.contactUnknown')}
            </StatusLabel>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {onEdit ? <Button onClick={onEdit}>{t('candidates.detail.edit')}</Button> : null}
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <p className="text-text-muted">{t('candidates.detail.lastUpdated')}</p>
            <p className="mt-1 font-semibold text-text">
              {formatDateTime(candidate.lastActivityAt)}
            </p>
          </div>
        </div>
      </header>
      {actions ? (
        <section className="flex flex-wrap gap-2" aria-label={t('candidates.drawer.actionsLabel')}>
          {actions}
        </section>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-sm text-text-muted">{t('candidates.detail.applicationsCount')}</p>
          <p className="mt-2 text-2xl font-bold text-text">{candidate.applicationCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-sm text-text-muted">{t('candidates.detail.emailsCount')}</p>
          <p className="mt-2 text-2xl font-bold text-text">{candidate.emailCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-sm text-text-muted">{t('candidates.detail.profiles')}</p>
          <p className="mt-2 text-2xl font-bold text-text">{candidate.occupationProfiles.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-sm text-text-muted">{t('candidates.detail.nextAction')}</p>
          <p className="mt-2 font-semibold text-accent">
            {getDomainLabel(t, 'candidateNextAction', candidate.nextAction)}
          </p>
        </div>
      </section>
      <nav
        className="-mx-1 overflow-x-auto border-b border-border"
        aria-label={t('candidates.detail.tabLabel')}
        role="tablist"
        onKeyDown={handleTabKeyDown}
      >
        <div className="flex min-w-max gap-1 px-1">
          {tabs.map(([id, key]) => (
            <button
              key={id}
              type="button"
              role="tab"
              data-tab-value={id}
              tabIndex={activeTab === id ? 0 : -1}
              aria-selected={activeTab === id}
              onClick={() => onTabChange(id)}
              className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}
            >
              {t(key as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </nav>
      {activeTab === 'overview' ? (
        <OverviewTab candidate={candidate} />
      ) : activeTab === 'applications' ? (
        <ApplicationsTab candidate={candidate} />
      ) : activeTab === 'journeys' ? (
        <JourneysTab candidate={candidate} />
      ) : (
        <SecondaryTab tab={activeTab} candidate={candidate} />
      )}
    </div>
  );
}

export function CandidateDetailPage({ candidateId }: { candidateId: string }) {
  const { t } = useI18n();
  const query = useCandidate(candidateId);
  const [activeTab, setActiveTab] = useDetailTab<CandidateTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  if (query.isPending) return <LoadingState label={t('candidates.detail.loading')} />;
  if (query.error || !query.data)
    return (
      <ErrorState message={t('candidates.detail.loadError')} onRetry={() => void query.refetch()} />
    );
  return (
    <>
      <CandidateProfileContent
        candidate={query.data}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={() => setEditOpen(true)}
      />
      <CandidateEditModal
        candidate={query.data}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          void query.refetch();
        }}
        onSaved={() => {
          setEditOpen(false);
          void query.refetch();
        }}
      />
    </>
  );
}
