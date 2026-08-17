import { JourneyDetailPage } from '@/features/journeys/components/journey-detail-page';

export default async function SupplyJourneyDetailRoute({ params }: { params: Promise<{ journeyId: string }> }) {
  const { journeyId } = await params;
  return <JourneyDetailPage journeyId={journeyId} />;
}
