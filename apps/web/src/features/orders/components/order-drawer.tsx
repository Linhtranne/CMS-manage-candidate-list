'use client';

import { useEffect, useState } from 'react';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useOrder } from '../services/order-queries';
import { OrderProfileContent, type OrderTab } from './order-profile-content';
import { useI18n } from '@/i18n/use-i18n';

export function OrderDrawer({ orderId, open, onClose }: { orderId?: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const query = useOrder(orderId);
  const order = query.data;
  const [activeTab, setActiveTab] = useState<OrderTab>('overview');

  useEffect(() => {
    if (!open) setActiveTab('overview');
  }, [open, orderId]);

  return <DetailDrawer open={open} title={t('orders.drawer.title')} size="wide" onClose={onClose}>
    {query.isPending ? <LoadingState label={t('orders.drawer.loading')} /> : query.error || !order ? <ErrorState message={t('orders.drawer.loadError')} onRetry={() => void query.refetch()} /> : <OrderProfileContent order={order} activeTab={activeTab} onTabChange={setActiveTab} />}
  </DetailDrawer>;
}
