'use client';

import { useState } from 'react';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { useCandidate } from '../services/candidate-queries';
import { candidatePhaseLabel } from './candidate-table';
import { CreateWorkDialog } from '@/features/work/components/create-work-dialog';
import { useI18n } from '@/i18n/use-i18n';
import { catalogLabel, occupationLabel } from '@/i18n/catalog-options';
import { getDomainLabel } from '@/i18n/domain-labels';

export function CandidateDrawer({ candidateId, open, onClose, onAddToOrder }: { candidateId?: string; open: boolean; onClose: () => void; onAddToOrder?: (candidateId: string) => void }) {
  const query = useCandidate(candidateId);
  const { t } = useI18n();
  const candidate = query.data;
  const [createWorkOpen, setCreateWorkOpen] = useState(false);

  return (
    <DetailDrawer open={open} title={t('candidates.drawer.title')} size="wide" onClose={onClose}>
      {query.isPending ? <LoadingState label={t('candidates.drawer.loading')} /> : query.error || !candidate ? <ErrorState message={t('candidates.drawer.loadError')} onRetry={() => void query.refetch()} /> : (
        <div className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-sm font-semibold text-accent">{candidate.code}</p>
              <h3 className="mt-1 text-2xl font-bold text-text">{candidate.name}</h3>
              <p className="mt-2 text-sm text-text-muted">{occupationLabel(t, candidate.occupation)} · {candidate.industryLabels.map((value) => catalogLabel(t, value)).join(', ')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusLabel tone="info">{t(candidatePhaseLabel(candidate.operationalPhase) as Parameters<typeof t>[0])}</StatusLabel>
                <StatusLabel tone={candidate.contactabilityStatus === 'CONTACTABLE' ? 'success' : 'warning'}>{candidate.contactabilityStatus === 'CONTACTABLE' ? t('candidates.drawer.contactable') : candidate.contactabilityStatus === 'DO_NOT_CONTACT' ? t('candidates.drawer.doNotContact') : t('candidates.drawer.contactUnknown')}</StatusLabel>
              </div>
            </div>
            <div className="text-right text-sm text-text-muted"><p>{t('candidates.drawer.owner')}</p><p className="mt-1 font-semibold text-text">{candidate.owner.name}</p></div>
          </header>
          <section className="flex flex-wrap gap-2" aria-label={t('candidates.drawer.actionsLabel')}>
            <ButtonLink variant="secondary" href={`/mailbox?query=${encodeURIComponent(candidate.name)}`}>{t('candidates.drawer.email')}</ButtonLink>
            <Button variant="secondary" onClick={() => onAddToOrder?.(candidate.id)}>{t('candidates.drawer.addToOrder')}</Button>
            <Button variant="secondary" onClick={() => setCreateWorkOpen(true)}>{t('candidates.drawer.createWork')}</Button>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">{t('candidates.drawer.contact')}</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">{t('candidates.form.email')}</dt><dd className="mt-1 font-semibold text-text">{candidate.email ?? candidate.emailMasked ?? t('candidates.drawer.notUpdated')}</dd></div><div><dt className="text-sm text-text-muted">{t('candidates.drawer.phone')}</dt><dd className="mt-1 font-semibold text-text">{candidate.phone ?? candidate.phoneMasked ?? t('candidates.drawer.notUpdated')}</dd></div><div><dt className="text-sm text-text-muted">{t('candidates.drawer.japanese')}</dt><dd className="mt-1 font-semibold text-text">{catalogLabel(t, candidate.japaneseLevel)}</dd></div><div><dt className="text-sm text-text-muted">{t('candidates.drawer.source')}</dt><dd className="mt-1 font-semibold text-text">{catalogLabel(t, candidate.source)}</dd></div></dl></section>
            <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">{t('candidates.drawer.processing')}</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-muted">{t('candidates.drawer.applicationCount')}</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.applicationCount}</dd></div><div><dt className="text-sm text-text-muted">{t('candidates.drawer.emailCount')}</dt><dd className="mt-1 text-2xl font-bold text-text">{candidate.emailCount}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-text-muted">{t('candidates.drawer.nextAction')}</dt><dd className="mt-1 font-semibold text-accent">{getDomainLabel(t, 'candidateNextAction', candidate.nextAction)}</dd></div></dl></section>
          </div>
          <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">{t('candidates.drawer.skills')}</h4><div className="mt-4 space-y-3">{candidate.occupationProfiles.map((profile) => <div key={`${profile.industryLabel}-${profile.occupation}`} className="rounded-control border border-border bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-text">{occupationLabel(t, profile.occupation)}</p><StatusLabel tone={profile.status === 'PRIMARY' ? 'info' : 'neutral'}>{catalogLabel(t, profile.industryLabel)}</StatusLabel></div><p className="mt-1 text-sm text-text-muted">{t('candidates.drawer.years', { count: profile.yearsExperience })} · {profile.skills.join(', ') || t('candidates.drawer.noSkills')}</p></div>)}</div></section>
          <p className="text-sm text-text-muted">{t('candidates.drawer.context')}</p>
          <CreateWorkDialog candidate={candidate} open={createWorkOpen} onClose={() => setCreateWorkOpen(false)} />
        </div>
      )}
    </DetailDrawer>
  );
}
