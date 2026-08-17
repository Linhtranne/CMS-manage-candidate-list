'use client';

import { useEffect, useState } from 'react';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useClient } from '../services/client-queries';
import { ClientProfileContent, type ClientTab } from './client-profile-content';

export function ClientDrawer({ clientId, open, onClose }: { clientId?: string; open: boolean; onClose: () => void }) {
  const query = useClient(clientId);
  const client = query.data;
  const [activeTab, setActiveTab] = useState<ClientTab>('overview');

  useEffect(() => {
    if (!open) setActiveTab('overview');
  }, [clientId, open]);

  return <DetailDrawer open={open} title="Hồ sơ khách hàng" size="wide" onClose={onClose}>
    {query.isPending ? <LoadingState /> : query.error || !client ? <ErrorState message="Không thể tải chi tiết khách hàng." onRetry={() => void query.refetch()} /> : <ClientProfileContent client={client} activeTab={activeTab} onTabChange={setActiveTab} />}
  </DetailDrawer>;
}
