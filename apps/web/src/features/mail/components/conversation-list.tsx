import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { conversationStatusLabel } from '../domain/email-status-label';

type Conversation = components['schemas']['Conversation'];
const columns: ColumnDef<Conversation>[] = [
  { accessorKey: 'subject', header: 'Chủ đề', cell: ({ row }) => <div><p className="font-semibold">{row.original.subject}</p><p className="mt-1 line-clamp-2 text-xs text-text-muted">{row.original.snippet}</p></div> },
  { accessorKey: 'candidate.name', header: 'Ứng viên', cell: ({ row }) => <div><p className="font-semibold">{row.original.candidate.name}</p><p className="text-xs text-text-muted">{row.original.candidate.code}</p></div> },
  { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => <StatusLabel tone={row.original.status === 'NEEDS_ACTION' || row.original.status === 'UNMATCHED' ? 'warning' : row.original.status === 'SENT' ? 'info' : 'neutral'}>{conversationStatusLabel(row.original.status)}</StatusLabel> },
  { accessorKey: 'messageCount', header: 'Số thư' },
  { accessorKey: 'lastActivityAt', header: 'Hoạt động cuối', cell: ({ row }) => new Date(row.original.lastActivityAt).toLocaleString('vi-VN') }
];

export function ConversationList({ conversations, isLoading, error, onRetry, onRowClick }: { conversations: Conversation[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick?: (conversation: Conversation) => void }) {
  return <CmsDataTable data={conversations} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle="Không có thư phù hợp" getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
