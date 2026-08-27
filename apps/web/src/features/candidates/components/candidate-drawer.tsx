'use client';

import { useEffect, useState } from 'react';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button, ButtonLink } from '@/components/ui/button';
import { useCandidate } from '../services/candidate-queries';
import { CreateWorkDialog } from '@/features/work/components/create-work-dialog';
import { useI18n } from '@/i18n/use-i18n';
import { CandidateEditModal } from './candidate-edit-modal';
import { CandidateProfileContent, type CandidateTab } from './candidate-detail-page';

export function CandidateDrawer({ candidateId, open, onClose, onAddToOrder }: { candidateId?: string; open: boolean; onClose: () => void; onAddToOrder?: (candidateId: string) => void }) {
  const query = useCandidate(candidateId);
  const { t } = useI18n();
  const candidate = query.data;
  const [createWorkOpen, setCreateWorkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CandidateTab>('overview');

  useEffect(() => {
    if (!open) {
      setActiveTab('overview');
      setCreateWorkOpen(false);
      setEditOpen(false);
    }
  }, [candidateId, open]);

  return (
    <>
      <DetailDrawer open={open} title={t('candidates.drawer.title')} size="wide" onClose={onClose}>
        {query.isPending ? <LoadingState label={t('candidates.drawer.loading')} /> : query.error || !candidate ? <ErrorState message={t('candidates.drawer.loadError')} onRetry={() => void query.refetch()} /> : (
          <CandidateProfileContent
            candidate={candidate}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onEdit={() => setEditOpen(true)}
            actions={
              <>
                <ButtonLink variant="secondary" href={`/mailbox?query=${encodeURIComponent(candidate.name)}`}>{t('candidates.drawer.email')}</ButtonLink>
                <Button variant="secondary" onClick={() => onAddToOrder?.(candidate.id)}>{t('candidates.drawer.addToOrder')}</Button>
                <Button variant="secondary" onClick={() => setCreateWorkOpen(true)}>{t('candidates.drawer.createWork')}</Button>
              </>
            }
          />
        )}
      </DetailDrawer>
      {candidate ? <CandidateEditModal candidate={candidate} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void query.refetch(); }} /> : null}
      {candidate ? <CreateWorkDialog candidate={candidate} open={createWorkOpen} onClose={() => setCreateWorkOpen(false)} /> : null}
    </>
  );
}
