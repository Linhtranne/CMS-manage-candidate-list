'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { StatusLabel } from '@/components/ui/status-label';
import { useListParams } from '@/hooks/use-list-params';
import { useOrders } from '../services/order-queries';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { OrderDrawer } from './order-drawer';

const columns: ColumnDef<JobOrder>[] = [
  { accessorKey: 'code', header: 'Mã đơn', cell: ({ row }) => <span className="font-semibold">{row.original.code}</span> },
  { accessorKey: 'position', header: 'Vị trí', cell: ({ row }) => <div><p className="font-semibold">{row.original.position}</p><p className="text-xs text-text-muted">{row.original.occupation}</p></div> },
  { accessorKey: 'client.name', header: 'Khách hàng', cell: ({ row }) => row.original.client.name },
  { accessorKey: 'industryLabel', header: 'Ngành nghề' },
  { accessorKey: 'location', header: 'Địa điểm' },
  { accessorKey: 'metrics.target', header: 'Chỉ tiêu', cell: ({ row }) => row.original.metrics.target },
  { accessorKey: 'metrics.activeApplications', header: 'Đang xử lý', cell: ({ row }) => row.original.metrics.activeApplications },
  { accessorKey: 'metrics.passed', header: 'Trúng tuyển', cell: ({ row }) => row.original.metrics.passed },
  { accessorKey: 'metrics.supplied', header: 'Đã cung ứng', cell: ({ row }) => row.original.metrics.supplied },
  { accessorKey: 'deadline', header: 'Hạn tuyển', cell: ({ row }) => new Date(row.original.deadline).toLocaleDateString('vi-VN') },
  { accessorKey: 'health', header: 'Sức khỏe đơn', cell: ({ row }) => <StatusLabel tone={row.original.health === 'FILLED' ? 'success' : 'warning'}>{row.original.health === 'UNDER_TARGET' ? 'Thiếu ứng viên' : row.original.health === 'INTERVIEW_DELAY' ? 'Chậm phỏng vấn' : row.original.health === 'EXPIRING' ? 'Sắp hết hạn' : row.original.health}</StatusLabel> },
  { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => row.original.status === 'RECRUITING' ? 'Đang tuyển' : row.original.status }
];

export function OrderListPage() {
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'all' });
  const query = useOrders({ query: params.query, industry: params.view === 'all' ? undefined : params.view });
  const open = (id: string) => setSelectedId(id);
  const close = () => setSelectedId(undefined);
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Nhu cầu tuyển dụng</p><h1 className="mt-1 text-2xl font-bold text-text">Đơn tuyển</h1><p className="mt-2 text-sm text-text-muted">Theo dõi chỉ tiêu, pipeline ứng tuyển và tiến độ cung ứng theo từng ngành.</p></div><Button variant="primary">Tạo đơn tuyển</Button></div><SavedViewBar><label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm đơn tuyển<input aria-label="Tìm đơn tuyển" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã đơn, vị trí, khách hàng" className="min-h-10 w-72 rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="flex items-center gap-2 text-sm text-text-muted">Ngành<select aria-label="Ngành nghề" value={params.view} onChange={(event) => setView(event.target.value)} className="min-h-10 rounded-control border border-border bg-panel px-3"><option value="all">Tất cả ngành</option><option value="Công nghệ thông tin">Công nghệ thông tin</option><option value="Cơ khí">Cơ khí</option><option value="Điều dưỡng">Điều dưỡng</option></select></label></SavedViewBar><CmsDataTable data={query.data?.items ?? []} columns={columns} isLoading={query.isPending} error={query.error ? 'Không thể tải danh sách đơn tuyển.' : undefined} onRetry={() => void query.refetch()} emptyTitle="Không có đơn tuyển phù hợp" getRowId={(row) => row.id} onRowClick={(row) => open(row.id)} /><OrderDrawer orderId={params.selectedId} open={Boolean(params.selectedId)} onClose={close} /></div>;
}
