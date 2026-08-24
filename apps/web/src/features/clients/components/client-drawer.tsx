'use client';

import { useEffect, useState } from 'react';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useClient } from '../services/client-queries';
import { ClientProfileContent, type ClientTab } from './client-profile-content';
import { ClientEditModal } from './client-edit-modal';
import { useI18n } from '@/i18n/use-i18n';

export function ClientDrawer({ clientId, open, onClose }: { clientId?: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const query = useClient(clientId);
  const client = query.data;
  const [activeTab, setActiveTab] = useState<ClientTab>('overview');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!open) setActiveTab('overview');
  }, [clientId, open]);

  return <>
    <DetailDrawer open={open} title={t('clients.drawer.title')} size="wide" onClose={onClose}>
      {query.isPending ? <LoadingState label={t('clients.drawer.loading')} /> : query.error || !client ? <ErrorState message={t('clients.drawer.loadError')} onRetry={() => void query.refetch()} /> : <ClientProfileContent client={client} activeTab={activeTab} onTabChange={setActiveTab} onEdit={() => setEditOpen(true)} />}
    </DetailDrawer>
    {client ? <ClientEditModal client={client} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void query.refetch(); }} /> : null}
  </>;
}
