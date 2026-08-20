import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import type { Translate } from '@/i18n/types';
import { deriveApplicationStage } from '../domain/derive-application-stage';
import { occupationLabel } from '@/i18n/catalog-options';

type Application = components['schemas']['Application'];
const stageKeys = { NEWLY_MATCHED: 'applications.table.stageNew', WAITING_INTERVIEW: 'applications.table.stageWaitingInterview', WAITING_RESULT: 'applications.table.stageWaitingResult', INTERVIEWED: 'applications.table.stageInterviewed', PASSED: 'applications.table.stagePassed', FAILED: 'applications.table.stageFailed', WITHDRAWN: 'applications.table.stageWithdrawn' } as const;
const actionKeys = { NEWLY_MATCHED: 'applications.table.actionSchedule', WAITING_RESULT: 'applications.table.actionResult', WAITING_INTERVIEW: 'applications.table.actionFollow', PASSED: 'applications.table.actionJourney' } as const;
function stageTone(stage: ReturnType<typeof deriveApplicationStage>) { if (stage === 'PASSED') return 'success' as const; if (stage === 'FAILED' || stage === 'WITHDRAWN') return 'danger' as const; if (stage === 'WAITING_RESULT') return 'warning' as const; return 'info' as const; }
function applicationColumns(t: Translate, formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string, formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string): ColumnDef<Application>[] { return [
  { accessorKey: 'candidate.name', header: t('applications.table.candidate'), cell: ({ row }) => <div><p className="font-semibold">{row.original.candidate.name}</p><p className="text-xs text-text-muted">{row.original.candidate.code}</p></div> },
  { accessorKey: 'order.code', header: t('applications.table.order'), cell: ({ row }) => <div><p className="font-semibold">{row.original.order.code}</p><p className="text-xs text-text-muted">{occupationLabel(t, row.original.order.position)}</p></div> },
  { accessorKey: 'client.name', header: t('applications.table.client'), cell: ({ row }) => row.original.client.name },
  { id: 'round', header: t('applications.table.round'), cell: ({ row }) => row.original.interviews.length ? t('applications.table.roundLabel', { round: Math.max(...row.original.interviews.map((item) => item.round)) }) : t('applications.table.noInterview') },
  { id: 'stage', header: t('applications.table.stage'), cell: ({ row }) => { const stage = deriveApplicationStage(row.original, row.original.interviews); return <StatusLabel tone={stageTone(stage)}>{t(stageKeys[stage])}</StatusLabel>; } },
  { id: 'schedule', header: t('applications.table.schedule'), cell: ({ row }) => { const item = [...row.original.interviews].sort((a, b) => b.round - a.round)[0]; return <span className="text-xs text-text-muted">{item ? formatDateTime(item.scheduledAt, { dateStyle: 'short', timeStyle: 'short' }) : t('applications.table.noSchedule')}</span>; } },
  { accessorKey: 'lastActivityAt', header: t('applications.table.lastActivity'), cell: ({ row }) => <span className="text-xs text-text-muted">{formatDate(row.original.lastActivityAt, { dateStyle: 'short' })}</span> },
  { id: 'nextAction', header: t('applications.table.nextAction'), cell: ({ row }) => { const stage = deriveApplicationStage(row.original, row.original.interviews); return <span className="font-semibold text-accent">{t((actionKeys[stage as keyof typeof actionKeys] ?? 'applications.table.actionReview') as Parameters<typeof t>[0])}</span>; } },
  { accessorKey: 'owner.name', header: t('applications.table.owner'), cell: ({ row }) => row.original.owner.name }
]; }
export function ApplicationTable({ applications, isLoading, error, onRetry, onRowClick }: { applications: Application[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (application: Application) => void }) { const { t, formatDate, formatDateTime } = useI18n(); return <CmsDataTable data={applications} columns={applicationColumns(t, formatDate, formatDateTime)} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle={t('applications.list.empty')} getRowId={(row) => row.id} onRowClick={onRowClick} />; }
