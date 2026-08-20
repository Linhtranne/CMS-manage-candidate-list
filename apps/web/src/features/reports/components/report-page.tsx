'use client';

import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { normalizeReportFilters, type ReportFilters } from '../domain/report-filters';
import { useReportFunnel, useReportSummary } from '../services/report-queries';
import { ExportReportDialog } from './export-report-dialog';
import { FunnelTable } from './funnel-table';
import { ReportFilterBar } from './report-filter-bar';
import { ReportSection } from './report-section';
import { useI18n } from '@/i18n/use-i18n';

export function ReportPage() {
  const { t, formatDateTime } = useI18n();
  const [filters, setFilters] = useState<ReportFilters>(() => normalizeReportFilters(typeof window === 'undefined' ? undefined : window.location.search));
  const [exportOpen, setExportOpen] = useState(false);
  const summaryQuery = useReportSummary(filters);
  const funnelQuery = useReportFunnel(filters);
  const updateFilters = (next: ReportFilters) => {
    const search = new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)) as [string, string][]);
    window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ''}`);
    setFilters(next);
  };
  const summary = summaryQuery.data;
  const asOf = useMemo(() => summary?.asOf ? formatDateTime(summary.asOf) : '', [formatDateTime, summary?.asOf]);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-accent">{t('reports.page.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold text-text">{t('reports.page.title')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-muted">{t('reports.page.description')}</p>
        </div></div>
        <ReportFilterBar filters={filters} onChange={updateFilters} onExport={() => setExportOpen(true)} />{summaryQuery.isPending || funnelQuery.isPending ? <LoadingState label={t('reports.page.loading')} /> : summaryQuery.error || funnelQuery.error ? <ErrorState message={t('reports.page.loadError')} onRetry={() => { void summaryQuery.refetch(); void funnelQuery.refetch(); }} /> : summary && funnelQuery.data ? <><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">{t('reports.page.updatedAt')} <strong className="text-text">{asOf}</strong> · {t('reports.page.timeZone')} {summary.filters.timeZone}</div><FunnelTable stages={funnelQuery.data.stages} /><ReportSection title={t('reports.page.funnel')} description={t('reports.page.funnelDescription')} metrics={summary.metrics} /><div className="grid gap-6 xl:grid-cols-2"><ReportSection title={t('reports.page.sourceQuality')} description={t('reports.page.sourceDescription')} metrics={summary.sourceQuality} /><ReportSection title={t('reports.page.clients')} description={t('reports.page.clientsDescription')} metrics={summary.clients} /><ReportSection title={t('reports.page.journeys')} description={t('reports.page.journeysDescription')} metrics={summary.journeys} /><ReportSection title={t('reports.page.mailbox')} description={t('reports.page.mailboxDescription')} metrics={summary.mailbox} /><ReportSection title={t('reports.page.workload')} description={t('reports.page.workloadDescription')} metrics={summary.workload} /><ReportSection title={t('reports.page.dataQuality')} description={t('reports.page.dataQualityDescription')} metrics={summary.dataQuality} /></div></> : <EmptyState title={t('reports.page.noData')} description={t('reports.page.noDataDescription')} />}<ExportReportDialog open={exportOpen} filters={filters} onClose={() => setExportOpen(false)} /></div>;
}
