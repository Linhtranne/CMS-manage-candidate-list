'use client';

import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { initialReportFilters, type ReportFilters } from '../domain/report-filters';
import { useReportFunnel, useReportSummary } from '../services/report-queries';
import { ExportReportDialog } from './export-report-dialog';
import { FunnelTable } from './funnel-table';
import { ReportFilterBar } from './report-filter-bar';
import { ReportSection } from './report-section';
import { useI18n } from '@/i18n/use-i18n';
import type { components } from '@cms/contracts';
import { reportCodeForMetricKey, reportDimensionForMetricKey } from '../domain/report-drilldown';
import { ReportDetailModal, FunnelReportModal } from './report-detail-modal';

type ReportMetric = components['schemas']['ReportMetric'];
type FunnelStage = components['schemas']['ReportFunnelStage'];

export function ReportPage() {
  const { t, formatDateTime } = useI18n();
  const [filters, setFilters] = useState<ReportFilters>(() => initialReportFilters(typeof window === 'undefined' ? undefined : window.location.search));
  const [exportOpen, setExportOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<{ code: string; dimension?: string }>();
  const summaryQuery = useReportSummary(filters);
  const funnelQuery = useReportFunnel(filters);
  const updateFilters = (next: ReportFilters) => {
    const search = new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)) as [string, string][]);
    window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ''}`);
    setFilters(next);
  };
  const summary = summaryQuery.data;
  const asOf = useMemo(() => summary?.asOf ? formatDateTime(summary.asOf) : '', [formatDateTime, summary?.asOf]);
  const openMetric = (metric: ReportMetric) => {
    const code = reportCodeForMetricKey(metric.key);
    if (code) setActiveReport({ code, dimension: reportDimensionForMetricKey(metric.key) });
  };
  const openStage = (stage: FunnelStage) => setActiveReport({ code: 'funnel', dimension: stage.key });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-text sm:text-3xl">{t('reports.page.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t('reports.page.description')}</p>
        </div>
      </header>

      <ReportFilterBar filters={filters} onChange={updateFilters} onExport={() => setExportOpen(true)} />

      {summaryQuery.isPending || funnelQuery.isPending ? (
        <LoadingState label={t('reports.page.loading')} />
      ) : summaryQuery.error || funnelQuery.error ? (
        <ErrorState message={t('reports.page.loadError')} onRetry={() => { void summaryQuery.refetch(); void funnelQuery.refetch(); }} />
      ) : summary && funnelQuery.data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
            <span>{t('reports.page.updatedAt')} <strong className="text-text">{asOf}</strong></span>
          </div>
          <FunnelTable stages={funnelQuery.data.stages} asOf={funnelQuery.data.asOf} onOpenStage={openStage} />
          <ReportSection title={t('reports.page.funnel')} metrics={summary.metrics} onOpenMetric={openMetric} />
          <div className="grid gap-5 xl:grid-cols-2">
            <ReportSection title={t('reports.page.sourceQuality')} metrics={summary.sourceQuality} onOpenMetric={openMetric} />
            <ReportSection title={t('reports.page.clients')} metrics={summary.clients} onOpenMetric={openMetric} />
            <ReportSection title={t('reports.page.journeys')} metrics={summary.journeys} onOpenMetric={openMetric} />
            <ReportSection title={t('reports.page.mailbox')} metrics={summary.mailbox} onOpenMetric={openMetric} />
            <ReportSection title={t('reports.page.workload')} metrics={summary.workload} onOpenMetric={openMetric} />
            <ReportSection title={t('reports.page.dataQuality')} metrics={summary.dataQuality} onOpenMetric={openMetric} />
          </div>
        </>
      ) : <EmptyState title={t('reports.page.noData')} />}

      <ExportReportDialog open={exportOpen} filters={filters} onClose={() => setExportOpen(false)} />
      {activeReport?.code === 'funnel' ? <FunnelReportModal open dimension={activeReport.dimension} filters={filters} onClose={() => setActiveReport(undefined)} /> : activeReport ? <ReportDetailModal open code={activeReport.code as 'candidate_inventory' | 'application_conversion' | 'order_pipeline' | 'journey_progress' | 'email_operations' | 'task_workload'} dimension={activeReport.dimension} filters={filters} onClose={() => setActiveReport(undefined)} /> : null}
    </div>
  );
}
