'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useClient } from '../services/client-queries';
import { ClientProfileContent, clientTabs, type ClientTab } from './client-profile-content';
import { ClientEditModal } from './client-edit-modal';

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useClient(clientId);
  const [editOpen, setEditOpen] = useState(false);
  const requestedTab = searchParams.get('tab') as ClientTab | null;
  const activeTab: ClientTab = clientTabs.some((tab) => tab.id === requestedTab) ? requestedTab ?? 'overview' : 'overview';

  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message="Không thể tải hồ sơ khách hàng." onRetry={() => void query.refetch()} />;

  const selectTab = (tab: ClientTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.replace(`/clients/${clientId}?${next.toString()}`, { scroll: false });
  };

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => router.back()} className="min-h-10 rounded-control px-3 text-sm font-semibold text-text-muted hover:bg-surface hover:text-text">Quay lại danh sách</button><p className="text-xs text-text-muted">Hồ sơ khách hàng</p></div><ClientProfileContent client={query.data} activeTab={activeTab} onTabChange={selectTab} onEdit={() => setEditOpen(true)} /><ClientEditModal client={query.data} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void query.refetch(); }} /></div>;
}
