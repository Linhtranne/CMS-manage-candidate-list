'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useI18n } from '@/i18n/use-i18n';
import { metricRate } from '../domain/metric';
import { funnelRecordsHref } from '../domain/report-drilldown';
import { initialReportFilters, type ReportFilters } from '../domain/report-filters';
import { useReportFunnel } from '../services/report-queries';
import { ExportReportDialog } from './export-report-dialog';
import { FunnelChart } from './report-charts';
import { ReportFilterBar } from './report-filter-bar';

export function FunnelReportDetailPage() {
  const { t, formatDateTime, formatNumber, formatPercent } = useI18n();
  const [filters, setFilters] = useState<ReportFilters>(() => initialReportFilters(typeof window === 'undefined' ? undefined : window.location.search));
  const [exportOpen, setExportOpen] = useState(false);
  const funnelQuery = useReportFunnel(filters);
  const funnel = funnelQuery.data;
  const selectedDimension = typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('dimension') ?? undefined;
  const selectedStage = funnel?.stages.find((stage) => stage.key.toLowerCase() === selectedDimension?.toLowerCase());

  const updateFilters = (next: ReportFilters) => {
    const search = new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (selectedDimension) search.set('dimension', selectedDimension);
    window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ''}`);
    setFilters(next);
  };

  return (
    <div className="space-y-6">
      <header>
        <Link href="/reports" className="text-sm font-semibold text-accent hover:underline">← {t('reports.detail.back')}</Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-accent">{t('reports.page.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-text sm:text-3xl">{t('reports.funnelDetail.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t('reports.funnelDetail.description')}</p>
      </header>

      <ReportFilterBar filters={filters} onChange={updateFilters} onExport={() => setExportOpen(true)} />

      {funnelQuery.isPending ? <LoadingState label={t('reports.detail.loading')} /> : funnelQuery.error ? <ErrorState message={t('reports.detail.loadError')} onRetry={() => void funnelQuery.refetch()} /> : funnel ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
            <span>{t('reports.detail.updatedAt')} <strong className="text-text">{formatDateTime(funnel.asOf)}</strong></span>
          </div>
          {selectedStage ? <p className="rounded-lg border border-accent/30 bg-[#f7fbff] px-4 py-3 text-sm font-semibold text-accent">{selectedStage.label} · {formatPercent(metricRate(selectedStage.numerator, selectedStage.denominator))}</p> : null}
          <FunnelChart stages={funnel.stages} />
          <section className="overflow-hidden rounded-xl border border-border bg-panel" aria-labelledby="funnel-breakdown-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><h2 id="funnel-breakdown-title" className="text-base font-bold text-text sm:text-lg">{t('reports.detail.breakdown')}</h2>{selectedStage ? <Link href={funnelRecordsHref(selectedStage.key) as Route} className="text-sm font-semibold text-accent hover:underline">{t('reports.funnelDetail.openRecords')}</Link> : null}</div>
            {funnel.stages.length ? <div className="overflow-x-auto"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-[0.08em] text-text-muted"><tr><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.stage')}</th><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.count')}</th><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.rate')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.updatedAt')}</th></tr></thead><tbody>{funnel.stages.map((stage) => <tr key={stage.key} className="border-b border-border last:border-0"><td className="px-4 py-3 font-semibold text-text">{stage.label}</td><td className="px-4 py-3"><Link href={funnelRecordsHref(stage.key) as Route} className="font-semibold text-accent underline underline-offset-2">{formatNumber(stage.numerator)}/{formatNumber(stage.denominator)}</Link></td><td className="px-4 py-3 text-text-muted">{formatPercent(metricRate(stage.numerator, stage.denominator))}</td><td className="px-4 py-3 text-text-muted">{formatDateTime(funnel.asOf)}</td></tr>)}</tbody></table></div> : <p className="px-4 py-6 text-sm text-text-muted">{t('reports.funnelDetail.noData')}</p>}
          </section>
        </>
      ) : <EmptyState title={t('reports.funnelDetail.noData')} />}

      <ExportReportDialog open={exportOpen} filters={filters} reportKey="application_conversion" onClose={() => setExportOpen(false)} />
    </div>
  );
}
