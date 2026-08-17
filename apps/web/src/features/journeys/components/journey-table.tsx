import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';

type Journey = components['schemas']['SupplyJourneySummary'];
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const healthLabel: Record<Journey['health'], string> = { ON_TRACK: 'Đúng tiến độ', OVERDUE: 'Quá hạn', AT_RISK: 'Có rủi ro', COMPLETED: 'Đã hoàn tất' };
const healthTone: Record<Journey['health'], 'success' | 'warning' | 'danger' | 'neutral'> = { ON_TRACK: 'success', OVERDUE: 'warning', AT_RISK: 'danger', COMPLETED: 'neutral' };

const columns: ColumnDef<Journey>[] = [
  { accessorKey: 'candidate.name', header: 'Ứng viên', cell: ({ row }) => <div><p className="font-semibold">{row.original.candidate.name}</p><p className="text-xs text-text-muted">{row.original.candidate.code}</p></div> },
  { accessorKey: 'order.code', header: 'Đơn tuyển', cell: ({ row }) => <div><p className="font-semibold">{row.original.order.code}</p><p className="text-xs text-text-muted">{row.original.order.position}</p></div> },
  { accessorKey: 'client.name', header: 'Khách hàng' },
  { accessorKey: 'templateName', header: 'Mẫu lộ trình', cell: ({ row }) => <div><p>{row.original.templateName}</p><p className="text-xs text-text-muted">{row.original.templateVersion}</p></div> },
  { accessorKey: 'currentMilestone', header: 'Mốc hiện tại' },
  { accessorKey: 'nearestDueAt', header: 'Hạn gần nhất', cell: ({ row }) => formatDate(row.original.nearestDueAt) },
  { accessorKey: 'progress', header: 'Tiến độ', cell: ({ row }) => `${row.original.progress.completed}/${row.original.progress.applicable} mốc` },
  { accessorKey: 'health', header: 'Sức khỏe', cell: ({ row }) => <StatusLabel tone={healthTone[row.original.health]}>{healthLabel[row.original.health]}</StatusLabel> },
  { accessorKey: 'owner.name', header: 'Phụ trách' }
];

export function JourneyTable({ journeys, isLoading, error, onRetry, onRowClick }: { journeys: Journey[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick?: (journey: Journey) => void }) {
  return <CmsDataTable data={journeys} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle="Chưa có lộ trình phù hợp" getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
