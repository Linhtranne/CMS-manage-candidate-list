'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useJourney } from '../services/journey-queries';
import { JourneyDetailContent } from './journey-detail-content';

export function JourneyDetailPage({ journeyId }: { journeyId: string }) {
  const query = useJourney(journeyId);
  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <div className="space-y-4"><Button variant="secondary" onClick={() => window.history.back()}>Quay lại</Button><ErrorState message="Không thể tải chi tiết lộ trình." onRetry={() => void query.refetch()} /></div>;
  return <div className="space-y-4"><Button variant="secondary" onClick={() => window.history.back()}>Quay lại danh sách</Button><JourneyDetailContent journey={query.data} /></div>;
}
