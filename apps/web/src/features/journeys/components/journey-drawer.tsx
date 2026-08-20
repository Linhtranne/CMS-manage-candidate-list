'use client';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';
import { useJourney } from '../services/journey-queries';
import { JourneyDetailContent } from './journey-detail-content';

export function JourneyDrawer({ journeyId, open, onClose }: { journeyId?: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const query = useJourney(journeyId);
  return <DetailDrawer open={open} title={t('journeys.detail.title')} size="wide" onClose={onClose}>{query.isPending ? <LoadingState /> : query.error || !query.data ? <ErrorState message={t('journeys.detail.loadError')} onRetry={() => void query.refetch()} /> : <JourneyDetailContent journey={query.data} compact />}</DetailDrawer>;
}
