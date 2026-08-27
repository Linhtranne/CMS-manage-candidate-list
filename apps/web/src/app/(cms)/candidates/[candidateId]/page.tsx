import { redirect } from 'next/navigation';

export default async function CandidateDetailRoute({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  redirect(`/candidates?selectedId=${encodeURIComponent(candidateId)}`);
}
