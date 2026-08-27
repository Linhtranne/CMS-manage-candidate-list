'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useMemo, useState } from 'react';
import type { components } from '@cms/contracts';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/types';
import { formatMetricValue, metricRate } from '../domain/metric';
import { getReportMetricLabel } from '../domain/report-labels';
import { reportRecordsHref } from '../domain/report-drilldown';
import { initialReportFilters, type ReportFilters } from '../domain/report-filters';
import { useReportSummary } from '../services/report-queries';
import { ExportReportDialog } from './export-report-dialog';
import { ReportBarChart } from './report-charts';
import { ReportFilterBar } from './report-filter-bar';

type ReportSummary = components['schemas']['ReportSummary'];
type ReportMetric = components['schemas']['ReportMetric'];
export type ReportCode = 'candidate_inventory' | 'application_conversion' | 'order_pipeline' | 'journey_progress' | 'email_operations' | 'task_workload';

type SummarySection = keyof Pick<ReportSummary, 'sourceQuality' | 'clients' | 'journeys' | 'mailbox' | 'workload' | 'dataQuality'>;

export const reportConfig: Record<ReportCode, { titleKey: TranslationKey; descriptionKey: TranslationKey; section: SummarySection }> = {
  candidate_inventory: { titleKey: 'reportCodes.candidateInventory', descriptionKey: 'reports.page.dataQualityDescription', section: 'dataQuality' },
  application_conversion: { titleKey: 'reportCodes.applicationConversion', descriptionKey: 'reports.page.sourceDescription', section: 'sourceQuality' },
  order_pipeline: { titleKey: 'reportCodes.orderPipeline', descriptionKey: 'reports.page.clientsDescription', section: 'clients' },
  journey_progress: { titleKey: 'reportCodes.journeyProgress', descriptionKey: 'reports.page.journeysDescription', section: 'journeys' },
  email_operations: { titleKey: 'reportCodes.emailOperations', descriptionKey: 'reports.page.mailboxDescription', section: 'mailbox' },
  task_workload: { titleKey: 'reportCodes.taskWorkload', descriptionKey: 'reports.page.workloadDescription', section: 'workload' }
};

function metricAmount(metric: ReportMetric): number {
  return metric.numerator ?? (metric.unit === 'COUNT' ? metric.value : 0);
}

export function ReportDetailPage({ code }: { code: string }) {
  const { t, formatDateTime, formatNumber, formatPercent } = useI18n();
  const config = reportConfig[code as ReportCode];
  const [filters, setFilters] = useState<ReportFilters>(() => initialReportFilters(typeof window === 'undefined' ? undefined : window.location.search));
  const [exportOpen, setExportOpen] = useState(false);
  const summaryQuery = useReportSummary(filters);
  const summary = summaryQuery.data;
  const selectedDimension = typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('dimension') ?? undefined;
  const metrics = useMemo(() => config && summary ? summary[config.section] : [], [config, summary]);
  const totals = useMemo(() => {
    const numerator = metrics.reduce((total, metric) => total + metricAmount(metric), 0);
    const denominator = metrics.reduce((total, metric) => total + (metric.denominator ?? 0), 0);
    return { numerator, denominator, rate: metricRate(numerator, denominator) };
  }, [metrics]);

  const updateFilters = (next: ReportFilters) => {
    const search = new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (selectedDimension) search.set('dimension', selectedDimension);
    window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ''}`);
    setFilters(next);
  };

  if (!config) return <EmptyState title={t('reports.detail.noData')} />;
  const asOf = summary?.asOf ? formatDateTime(summary.asOf) : '';
  const selectedLabel = selectedDimension ? getReportMetricLabel(t, `${code}:${selectedDimension}`) : undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/reports" className="text-sm font-semibold text-accent hover:underline">← {t('reports.detail.back')}</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-accent">{t('reports.page.eyebrow')}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-text sm:text-3xl">{t(config.titleKey)}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t(config.descriptionKey)}</p>
        </div>
      </header>

      <ReportFilterBar filters={filters} onChange={updateFilters} onExport={() => setExportOpen(true)} />

      {summaryQuery.isPending ? <LoadingState label={t('reports.detail.loading')} /> : summaryQuery.error ? <ErrorState message={t('reports.detail.loadError')} onRetry={() => void summaryQuery.refetch()} /> : summary ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
            <span>{t('reports.detail.updatedAt')} <strong className="text-text">{asOf}</strong></span>
          </div>

          {selectedLabel ? <p className="rounded-lg border border-accent/30 bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-accent">{t('reports.detail.selectedDimension', { dimension: selectedLabel })}</p> : null}

          <section className="grid gap-3 sm:grid-cols-3" aria-label={t('reports.detail.overview')}>
            <article className="rounded-xl border border-border bg-panel p-4"><p className="text-sm text-text-muted">{t('reports.detail.count')}</p><p className="mt-2 text-2xl font-bold text-text">{formatNumber(totals.numerator || metrics.reduce((total, metric) => total + metric.value, 0))}</p></article>
            <article className="rounded-xl border border-border bg-panel p-4"><p className="text-sm text-text-muted">{t('reports.detail.rate')}</p><p className="mt-2 text-2xl font-bold text-text">{totals.denominator ? formatPercent(totals.rate) : '—'}</p></article>
            <article className="rounded-xl border border-border bg-panel p-4"><p className="text-sm text-text-muted">{t('reports.detail.breakdown')}</p><p className="mt-2 text-2xl font-bold text-text">{formatNumber(metrics.length)}</p></article>
          </section>

          <ReportBarChart code={code} metrics={metrics} />

          <section className="overflow-hidden rounded-xl border border-border bg-panel" aria-labelledby="report-breakdown-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <h2 id="report-breakdown-title" className="text-base font-bold text-text sm:text-lg">{t('reports.detail.breakdown')}</h2>
              <Link href={reportRecordsHref(code) as Route} className="text-sm font-semibold text-accent hover:underline">{t('reports.detail.openRecords')}</Link>
            </div>
            {metrics.length ? <div className="overflow-x-auto"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-[0.08em] text-text-muted"><tr><th className="px-4 py-3 font-semibold">{t('reports.detail.dimension')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.count')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.rate')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.updatedAt')}</th></tr></thead><tbody>{metrics.map((metric) => { const label = getReportMetricLabel(t, metric.key, metric.label); const value = formatMetricValue(metric, { days: t('metrics.days'), minutes: t('metrics.minutes'), formatNumber, formatPercent }); const rate = metric.numerator !== undefined && metric.denominator !== undefined ? formatPercent(metricRate(metric.numerator, metric.denominator)) : '—'; return <tr key={metric.key} className="border-b border-border last:border-0"><td className="px-4 py-3 font-semibold text-text">{label}</td><td className="px-4 py-3"><Link href={reportRecordsHref(code, metric.key) as Route} className="font-semibold text-accent underline underline-offset-2">{value}</Link></td><td className="px-4 py-3 text-text-muted">{rate}</td><td className="px-4 py-3 text-text-muted">{formatDateTime(metric.asOf)}</td></tr>; })}</tbody></table></div> : <p className="px-4 py-6 text-sm text-text-muted">{t('reports.detail.noRows')}</p>}
          </section>
        </>
      ) : <EmptyState title={t('reports.detail.noData')} />}

      <ExportReportDialog open={exportOpen} filters={filters} reportKey={code} onClose={() => setExportOpen(false)} />
    </div>
  );
}
