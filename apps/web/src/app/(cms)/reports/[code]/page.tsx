import { ReportDetailPage } from '@/features/reports/components/report-detail-page';

export default async function ReportDetailRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReportDetailPage code={code} />;
}
