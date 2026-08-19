'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { StatusLabel } from '@/components/ui/status-label';
import { useListParams } from '@/hooks/use-list-params';
import { useClients } from '../services/client-queries';
import type { Client } from '../services/client-types';
import { ClientDrawer } from './client-drawer';
import { CreateClientModal } from './create-client-modal';

const columns: ColumnDef<Client>[] = [
  { accessorKey: 'code', header: 'Mã khách hàng', cell: ({ row }) => <span className="font-semibold">{row.original.code}</span> },
  { accessorKey: 'name', header: 'Tên tổ chức', cell: ({ row }) => <div><p className="font-semibold">{row.original.name}</p><p className="text-xs text-text-muted">{row.original.region}</p></div> },
  { accessorKey: 'organizationType', header: 'Loại tổ chức' },
  { accessorKey: 'industryLabels', header: 'Ngành nghề', cell: ({ row }) => row.original.industryLabels.join(', ') },
  { accessorKey: 'owner.name', header: 'Phụ trách nội bộ', cell: ({ row }) => row.original.owner.name },
  { accessorKey: 'activeOrders', header: 'Đơn đang tuyển' },
  { accessorKey: 'target', header: 'Chỉ tiêu đang tuyển' },
  { accessorKey: 'passed', header: 'Đã trúng tuyển' },
  { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusLabel tone={row.original.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.original.status === 'ACTIVE' ? 'Đang hợp tác' : row.original.status === 'PROSPECT' ? 'Tiềm năng' : row.original.status}</StatusLabel> },
  { accessorKey: 'lastActivity', header: 'Hoạt động cuối', cell: ({ row }) => <span className="text-xs text-text-muted">{new Date(row.original.lastActivity).toLocaleDateString('vi-VN')}</span> }
];

export function ClientListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'all' });
  const query = useClients({ query: params.query, status: params.view === 'all' ? undefined : params.view.toUpperCase() });
  const open = (id: string) => setSelectedId(id);
  const close = () => setSelectedId(undefined);
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Danh mục tổ chức</p><h1 className="mt-1 text-2xl font-bold text-text">Khách hàng</h1><p className="mt-2 text-sm text-text-muted">Ngữ cảnh tiếp nhận nhân sự, không mở rộng thành CRM doanh thu.</p></div><Button variant="primary" onClick={() => setCreateOpen(true)}>Thêm khách hàng</Button></div><SavedViewBar><label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm khách hàng<input aria-label="Tìm khách hàng" name="tim-khach-hang" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã, ngành nghề" className="min-h-10 min-w-0 flex-1 rounded-control border border-border bg-panel px-3 font-normal sm:w-72 sm:flex-none" /></label><label className="flex items-center gap-2 text-sm text-text-muted">Trạng thái<select aria-label="Trạng thái khách hàng" name="trang-thai-khach-hang" value={params.view} onChange={(event) => setView(event.target.value)} className="min-h-10 rounded-control border border-border bg-panel px-3"><option value="all">Tất cả</option><option value="active">Đang hợp tác</option><option value="prospect">Tiềm năng</option><option value="paused">Tạm dừng</option></select></label></SavedViewBar><CmsDataTable data={query.data?.items ?? []} columns={columns} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách khách hàng.' : undefined} onRetry={() => void query.refetch()} emptyTitle="Không có khách hàng phù hợp" getRowId={(row) => row.id} onRowClick={(row) => open(row.id)} /><ClientDrawer clientId={params.selectedId} open={Boolean(params.selectedId)} onClose={close} /><CreateClientModal open={createOpen} onClose={() => setCreateOpen(false)} /></div>;
}
