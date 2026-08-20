'use client';

import { useDetailTab } from '@/hooks/use-detail-tab';
import { useI18n } from '@/i18n/use-i18n';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useOrder } from '../services/order-queries';
import { OrderProfileContent, type OrderTab } from './order-profile-content';

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const query = useOrder(orderId);
  const [activeTab, setActiveTab] = useDetailTab<OrderTab>('overview');
  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={t('validation.runtime.orderLoadError')} onRetry={() => void query.refetch()} />;
  return <OrderProfileContent order={query.data} activeTab={activeTab} onTabChange={setActiveTab} />;
}
