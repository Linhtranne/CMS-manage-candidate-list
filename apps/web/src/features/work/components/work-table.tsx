import type { ColumnDef } from '@tanstack/react-table';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import type { Translate } from '@/i18n/types';
import type { WorkItem } from '../types';
import { getDomainLabel } from '@/i18n/domain-labels';
import { occupationLabel } from '@/i18n/catalog-options';

const priorityTone = { URGENT: 'danger', HIGH: 'warning', NORMAL: 'neutral' } as const;
const priorityKeys = { URGENT: 'work.table.priorities.urgent', HIGH: 'work.table.priorities.high', NORMAL: 'work.table.priorities.normal' } as const;
const statusKeys = { TODO: 'work.table.statuses.todo', IN_PROGRESS: 'work.table.statuses.inProgress', WAITING_REPLY: 'work.table.statuses.waitingReply', DONE: 'work.table.statuses.done' } as const;

function workColumns(t: Translate, formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string): ColumnDef<WorkItem>[] {
  return [
    { accessorKey: 'priority', header: t('work.table.priority'), cell: ({ getValue }) => { const value = getValue<WorkItem['priority']>(); return <StatusLabel tone={priorityTone[value]}>{t(priorityKeys[value])}</StatusLabel>; } },
    { accessorKey: 'dueAt', header: t('work.table.dueAt'), cell: ({ row }) => <span className={new Date(row.original.dueAt).getTime() < Date.now() ? 'font-semibold text-danger' : 'text-text'}>{formatDateTime(row.original.dueAt, { dateStyle: 'short', timeStyle: 'short' })}</span> },
    { accessorKey: 'title', header: t('work.table.task'), cell: ({ row }) => <div><p className="font-semibold">{getDomainLabel(t, 'workTask', row.original.title)}</p><p className="mt-1 text-xs text-text-muted">{getDomainLabel(t, 'workSource', row.original.sourceType)}</p></div> },
    { accessorKey: 'candidate.name', header: t('work.table.candidate'), cell: ({ row }) => <span>{row.original.candidate.code} · {row.original.candidate.name}</span> },
    { accessorKey: 'order.code', header: t('work.table.order'), cell: ({ row }) => <span>{row.original.order.code}<br /><span className="text-xs text-text-muted">{occupationLabel(t, row.original.order.position)}</span></span> },
    { accessorKey: 'client.name', header: t('work.table.client'), cell: ({ row }) => row.original.client.name },
    { accessorKey: 'status', header: t('work.table.status'), cell: ({ getValue }) => t(statusKeys[getValue<WorkItem['status']>()]) },
    { accessorKey: 'assignee.name', header: t('work.table.assignee'), cell: ({ row }) => row.original.assignee.name },
    { accessorKey: 'lastActivity', header: t('work.table.lastActivity'), cell: ({ getValue }) => <span className="text-xs text-text-muted">{getValue<string>() ?? '—'}</span> }
  ];
}

export function WorkTable({ items, isLoading, error, onRetry, onRowClick }: { items: WorkItem[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (item: WorkItem) => void }) {
  const { t, formatDateTime } = useI18n();
  return <CmsDataTable data={items} columns={workColumns(t, formatDateTime)} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle={t('work.empty')} getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
