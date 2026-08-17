'use client';

import { useEffect, useState } from 'react';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useOrder } from '../services/order-queries';
import { OrderProfileContent, type OrderTab } from './order-profile-content';

export function OrderDrawer({ orderId, open, onClose }: { orderId?: string; open: boolean; onClose: () => void }) {
  const query = useOrder(orderId);
  const order = query.data;
  const [activeTab, setActiveTab] = useState<OrderTab>('overview');

  useEffect(() => {
    if (!open) setActiveTab('overview');
  }, [open, orderId]);

  return <DetailDrawer open={open} title="Hồ sơ đơn tuyển" size="wide" onClose={onClose}>
    {query.isPending ? <LoadingState /> : query.error || !order ? <ErrorState message="Không thể tải chi tiết đơn tuyển." onRetry={() => void query.refetch()} /> : <OrderProfileContent order={order} activeTab={activeTab} onTabChange={setActiveTab} />}
  </DetailDrawer>;
}
