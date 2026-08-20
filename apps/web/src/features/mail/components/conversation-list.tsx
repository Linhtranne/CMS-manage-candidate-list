import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { conversationStatusLabel } from '../domain/email-status-label';
import { useI18n } from '@/i18n/use-i18n';

type Conversation = components['schemas']['Conversation'];
export function ConversationList({ conversations, isLoading, error, onRetry, onRowClick }: { conversations: Conversation[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick?: (conversation: Conversation) => void }) {
  const { t, formatDateTime } = useI18n();
  const columns: ColumnDef<Conversation>[] = [
    { accessorKey: 'subject', header: t('mailbox.list.subject'), cell: ({ row }) => <div><p className="font-semibold">{row.original.subject}</p><p className="mt-1 line-clamp-2 text-xs text-text-muted">{row.original.snippet}</p></div> },
    { accessorKey: 'candidate.name', header: t('mailbox.context.candidate'), cell: ({ row }) => <div><p className="font-semibold">{row.original.candidate.name}</p><p className="text-xs text-text-muted">{row.original.candidate.code}</p></div> },
    { accessorKey: 'status', header: t('mailbox.list.status'), cell: ({ row }) => <StatusLabel tone={row.original.status === 'NEEDS_ACTION' || row.original.status === 'UNMATCHED' ? 'warning' : row.original.status === 'SENT' ? 'info' : 'neutral'}>{conversationStatusLabel(row.original.status, t)}</StatusLabel> },
    { accessorKey: 'messageCount', header: t('mailbox.list.messageCount') },
    { accessorKey: 'lastActivityAt', header: t('mailbox.list.lastActivity'), cell: ({ row }) => formatDateTime(row.original.lastActivityAt) }
  ];
  return <CmsDataTable data={conversations} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle={t('mailbox.list.empty')} getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
