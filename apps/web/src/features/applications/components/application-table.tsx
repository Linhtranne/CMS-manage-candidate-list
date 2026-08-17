import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { deriveApplicationStage } from '../domain/derive-application-stage';

type Application = components['schemas']['Application'];

const stageLabels: Record<ReturnType<typeof deriveApplicationStage>, string> = {
  NEWLY_MATCHED: 'Mới ghép',
  WAITING_INTERVIEW: 'Chờ phỏng vấn',
  WAITING_RESULT: 'Chờ kết quả',
  INTERVIEWED: 'Đã phỏng vấn',
  PASSED: 'Đã trúng tuyển',
  FAILED: 'Không đạt',
  WITHDRAWN: 'Đã rút'
};

function stageTone(stage: ReturnType<typeof deriveApplicationStage>) {
  if (stage === 'PASSED') return 'success' as const;
  if (stage === 'FAILED' || stage === 'WITHDRAWN') return 'danger' as const;
  if (stage === 'WAITING_RESULT') return 'warning' as const;
  return 'info' as const;
}

function latestSchedule(application: Application) {
  const item = [...application.interviews].sort((a, b) => b.round - a.round)[0];
  return item ? new Date(item.scheduledAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa lên lịch';
}

export function ApplicationTable({ applications, isLoading, error, onRetry, onRowClick }: { applications: Application[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (application: Application) => void }) {
  const columns: ColumnDef<Application>[] = [
    { accessorKey: 'candidate.name', header: 'Ứng viên', cell: ({ row }) => <div><p className="font-semibold">{row.original.candidate.name}</p><p className="text-xs text-text-muted">{row.original.candidate.code}</p></div> },
    { accessorKey: 'order.code', header: 'Đơn tuyển', cell: ({ row }) => <div><p className="font-semibold">{row.original.order.code}</p><p className="text-xs text-text-muted">{row.original.order.position}</p></div> },
    { accessorKey: 'client.name', header: 'Khách hàng', cell: ({ row }) => row.original.client.name },
    { id: 'round', header: 'Vòng', cell: ({ row }) => row.original.interviews.length ? `Vòng ${Math.max(...row.original.interviews.map((item) => item.round))}` : 'Chưa PV' },
    { id: 'stage', header: 'Giai đoạn', cell: ({ row }) => { const stage = deriveApplicationStage(row.original, row.original.interviews); return <StatusLabel tone={stageTone(stage)}>{stageLabels[stage]}</StatusLabel>; } },
    { id: 'schedule', header: 'Lịch gần nhất', cell: ({ row }) => <span className="text-xs text-text-muted">{latestSchedule(row.original)}</span> },
    { accessorKey: 'lastActivityAt', header: 'Hoạt động cuối', cell: ({ row }) => <span className="text-xs text-text-muted">{new Date(row.original.lastActivityAt).toLocaleDateString('vi-VN')}</span> },
    { id: 'nextAction', header: 'Việc tiếp theo', cell: ({ row }) => { const stage = deriveApplicationStage(row.original, row.original.interviews); const action = stage === 'NEWLY_MATCHED' ? 'Lên lịch vòng 1' : stage === 'WAITING_RESULT' ? 'Nhập kết quả' : stage === 'WAITING_INTERVIEW' ? 'Theo dõi lịch' : stage === 'PASSED' ? 'Khởi tạo journey' : 'Rà soát hồ sơ'; return <span className="font-semibold text-accent">{action}</span>; } },
    { accessorKey: 'owner.name', header: 'Phụ trách', cell: ({ row }) => row.original.owner.name }
  ];

  return <CmsDataTable data={applications} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle="Không có đơn ứng tuyển phù hợp" getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
