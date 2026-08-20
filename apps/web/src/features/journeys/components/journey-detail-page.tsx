'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';
import { useJourney } from '../services/journey-queries';
import { JourneyDetailContent } from './journey-detail-content';

export function JourneyDetailPage({ journeyId }: { journeyId: string }) {
  const { t } = useI18n();
  const query = useJourney(journeyId);
  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <div className="space-y-4"><Button variant="secondary" onClick={() => window.history.back()}>{t('journeys.detail.back')}</Button><ErrorState message={t('journeys.detail.loadError')} onRetry={() => void query.refetch()} /></div>;
  return <div className="space-y-4"><Button variant="secondary" onClick={() => window.history.back()}>{t('journeys.detail.back')}</Button><JourneyDetailContent journey={query.data} /></div>;
}
