import { ClientDetailPage } from '@/features/clients/components/client-detail-page';
export default async function ClientDetailRoute({ params }: { params: Promise<{ clientId: string }> }) { const { clientId } = await params; return <ClientDetailPage clientId={clientId} />; }

