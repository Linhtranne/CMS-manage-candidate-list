'use client';

import { useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useOrder } from '../services/order-queries';
import { OrderProfileContent, type OrderTab } from './order-profile-content';

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const query = useOrder(orderId);
  const [activeTab, setActiveTab] = useState<OrderTab>('overview');
  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message="Không thể tải hồ sơ đơn tuyển." onRetry={() => void query.refetch()} />;
  return <OrderProfileContent order={query.data} activeTab={activeTab} onTabChange={setActiveTab} />;
}
