import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';

type ReportExportJob = components['schemas']['ReportExportJob'];

export function ExportJobStatus({ job }: { job: ReportExportJob }) {
  const { t, formatDateTime } = useI18n();
  if (job.status === 'COMPLETED' && job.downloadUrl) return <div className="rounded-lg border border-[#b9dec9] bg-[#f5fcf7] p-4"><StatusLabel tone="success">{t('reports.job.created')}</StatusLabel><p className="mt-2 text-sm text-text-muted">{t('reports.job.expiresAt')} {job.expiresAt ? formatDateTime(job.expiresAt) : t('reports.job.unknown')}.</p><a className="mt-3 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]" href={job.downloadUrl}>{t('reports.job.download')} {job.format}</a></div>;
  if (job.status === 'FAILED') return <div className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-4 text-sm text-danger">{job.error ?? t('reports.export.createError')}</div>;
  if (job.status === 'EXPIRED') return <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">{t('reports.job.expired')}</div>;
  return <div className="rounded-lg border border-border bg-surface p-4"><StatusLabel tone="info">{job.status === 'QUEUED' ? t('reports.job.queued') : t('reports.job.creating')}</StatusLabel><p className="mt-2 text-sm text-text-muted">{t('reports.job.auditHint')}</p></div>;
}
