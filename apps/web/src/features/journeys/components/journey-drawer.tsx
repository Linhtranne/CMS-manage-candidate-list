'use client';

import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useJourney } from '../services/journey-queries';
import { JourneyDetailContent } from './journey-detail-content';

export function JourneyDrawer({ journeyId, open, onClose }: { journeyId?: string; open: boolean; onClose: () => void }) {
  const query = useJourney(journeyId);
  return <DetailDrawer open={open} title="Chi tiết lộ trình cung ứng" size="wide" onClose={onClose}>{query.isPending ? <LoadingState /> : query.error || !query.data ? <ErrorState message="Không thể tải chi tiết lộ trình." onRetry={() => void query.refetch()} /> : <JourneyDetailContent journey={query.data} compact />}</DetailDrawer>;
}
