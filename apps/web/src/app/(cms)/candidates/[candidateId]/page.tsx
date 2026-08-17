import { CandidateDetailPage } from '@/features/candidates/components/candidate-detail-page';

export default async function CandidateDetailRoute({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  return <CandidateDetailPage candidateId={candidateId} />;
}
