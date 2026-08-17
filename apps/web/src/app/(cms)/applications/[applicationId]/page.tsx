import { ApplicationDetailPage } from '@/features/applications/components/application-detail-page';

export default async function ApplicationDetailRoute({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return <ApplicationDetailPage applicationId={applicationId} />;
}
