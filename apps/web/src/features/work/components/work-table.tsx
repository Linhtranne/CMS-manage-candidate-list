import type { ColumnDef } from '@tanstack/react-table';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import type { WorkItem } from '../types';

const priorityTone = { URGENT: 'danger', HIGH: 'warning', NORMAL: 'neutral' } as const;
const priorityLabel = { URGENT: 'Khẩn cấp', HIGH: 'Cao', NORMAL: 'Bình thường' } as const;
const statusLabel = { TODO: 'Chưa làm', IN_PROGRESS: 'Đang xử lý', WAITING_REPLY: 'Chờ phản hồi', DONE: 'Đã hoàn thành' } as const;

const columns: ColumnDef<WorkItem>[] = [
  { accessorKey: 'priority', header: 'Ưu tiên', cell: ({ getValue }) => <StatusLabel tone={priorityTone[getValue<WorkItem['priority']>()]}>{priorityLabel[getValue<WorkItem['priority']>()]}</StatusLabel> },
  { accessorKey: 'dueAt', header: 'Hạn xử lý', cell: ({ row }) => <span className={new Date(row.original.dueAt).getTime() < Date.now() ? 'font-semibold text-danger' : 'text-text'}>{new Date(row.original.dueAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span> },
  { accessorKey: 'title', header: 'Công việc', cell: ({ row }) => <div><p className="font-semibold">{row.original.title}</p><p className="mt-1 text-xs text-text-muted">{row.original.sourceLabel}</p></div> },
  { accessorKey: 'candidate.name', header: 'Ứng viên', cell: ({ row }) => <span>{row.original.candidate.code} · {row.original.candidate.name}</span> },
  { accessorKey: 'order.code', header: 'Đơn tuyển', cell: ({ row }) => <span>{row.original.order.code}<br /><span className="text-xs text-text-muted">{row.original.order.position}</span></span> },
  { accessorKey: 'client.name', header: 'Khách hàng', cell: ({ row }) => row.original.client.name },
  { accessorKey: 'status', header: 'Trạng thái', cell: ({ getValue }) => statusLabel[getValue<WorkItem['status']>()] },
  { accessorKey: 'assignee.name', header: 'Phụ trách', cell: ({ row }) => row.original.assignee.name },
  { accessorKey: 'lastActivity', header: 'Hoạt động cuối', cell: ({ getValue }) => <span className="text-xs text-text-muted">{getValue<string>() ?? '—'}</span> }
];

export function WorkTable({ items, isLoading, error, onRetry, onRowClick }: { items: WorkItem[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (item: WorkItem) => void }) {
  return <CmsDataTable data={items} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle="Không có công việc phù hợp" getRowId={(row) => row.id} onRowClick={onRowClick} />;
}

