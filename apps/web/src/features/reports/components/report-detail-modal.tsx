'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { formatMetricValue, metricRate } from '../domain/metric';
import { getReportMetricLabel } from '../domain/report-labels';
import { funnelRecordsHref, reportRecordsHref } from '../domain/report-drilldown';
import type { ReportFilters } from '../domain/report-filters';
import { useReportFunnel, useReportSummary } from '../services/report-queries';
import { ReportBarChart, FunnelChart } from './report-charts';
import { reportConfig, type ReportCode } from './report-detail-page';

type ReportMetric = components['schemas']['ReportMetric'];
type FunnelStage = components['schemas']['ReportFunnelStage'];

function DetailTable({ code, metrics }: { code: ReportCode; metrics: ReportMetric[] }) {
  const { t, formatDateTime, formatNumber, formatPercent } = useI18n();
  return metrics.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-[0.08em] text-text-muted"><tr><th className="px-4 py-3 font-semibold">{t('reports.detail.dimension')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.count')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.rate')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.updatedAt')}</th></tr></thead><tbody>{metrics.map((metric) => { const label = getReportMetricLabel(t, metric.key, metric.label); const value = formatMetricValue(metric, { days: t('metrics.days'), minutes: t('metrics.minutes'), formatNumber, formatPercent }); const rate = metric.numerator !== undefined && metric.denominator !== undefined ? formatPercent(metricRate(metric.numerator, metric.denominator)) : '—'; return <tr key={metric.key} className="border-b border-border last:border-0"><td className="px-4 py-3 font-semibold text-text">{label}</td><td className="px-4 py-3"><Link href={reportRecordsHref(code, metric.key) as Route} className="font-semibold text-accent underline underline-offset-2">{value}</Link></td><td className="px-4 py-3 text-text-muted">{rate}</td><td className="px-4 py-3 text-text-muted">{formatDateTime(metric.asOf)}</td></tr>; })}</tbody></table></div> : <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-text-muted">{t('reports.detail.noRows')}</p>;
}

export function ReportDetailModal({ open, code, dimension, filters, onClose }: { open: boolean; code: ReportCode; dimension?: string; filters: ReportFilters; onClose: () => void }) {
  const { t, formatDateTime } = useI18n();
  const summaryQuery = useReportSummary(filters);
  const summary = summaryQuery.data;
  const metrics = summary ? summary[reportConfig[code].section] : [];
  const selectedLabel = dimension ? getReportMetricLabel(t, `${code}:${dimension}`) : undefined;
  return <Modal open={open} onClose={onClose} title={t(reportConfig[code].titleKey)} size="lg">
    {summaryQuery.isPending ? <LoadingState label={t('reports.detail.loading')} /> : summaryQuery.error ? <ErrorState message={t('reports.detail.loadError')} onRetry={() => void summaryQuery.refetch()} /> : summary ? <div className="space-y-5">
      <p className="text-sm leading-6 text-text-muted">{t(reportConfig[code].descriptionKey)}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-muted"><span>{t('reports.detail.updatedAt')} <strong className="text-text">{formatDateTime(summary.asOf)}</strong></span></div>
      {selectedLabel ? <p className="rounded-lg border border-accent/30 bg-[#f7fbff] px-3 py-2 text-sm font-semibold text-accent">{t('reports.detail.selectedDimension', { dimension: selectedLabel })}</p> : null}
      <ReportBarChart code={code} metrics={metrics} />
      <section className="space-y-3"><h3 className="text-base font-bold text-text">{t('reports.detail.breakdown')}</h3><DetailTable code={code} metrics={metrics} /></section>
    </div> : <EmptyState title={t('reports.detail.noData')} />}
  </Modal>;
}

function FunnelTableInModal({ stages, asOf }: { stages: FunnelStage[]; asOf: string }) {
  const { t, formatDateTime, formatNumber, formatPercent } = useI18n();
  return stages.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-[0.08em] text-text-muted"><tr><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.stage')}</th><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.count')}</th><th className="px-4 py-3 font-semibold">{t('reports.funnelDetail.rate')}</th><th className="px-4 py-3 font-semibold">{t('reports.detail.updatedAt')}</th></tr></thead><tbody>{stages.map((stage) => <tr key={stage.key} className="border-b border-border last:border-0"><td className="px-4 py-3 font-semibold text-text">{getDomainLabel(t, 'reportFunnelStage', stage.key)}</td><td className="px-4 py-3"><Link href={funnelRecordsHref(stage.key) as Route} className="font-semibold text-accent underline underline-offset-2">{formatNumber(stage.numerator)}/{formatNumber(stage.denominator)}</Link></td><td className="px-4 py-3 text-text-muted">{formatPercent(metricRate(stage.numerator, stage.denominator))}</td><td className="px-4 py-3 text-text-muted">{formatDateTime(asOf)}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-text-muted">{t('reports.funnelDetail.noData')}</p>;
}

export function FunnelReportModal({ open, dimension, filters, onClose }: { open: boolean; dimension?: string; filters: ReportFilters; onClose: () => void }) {
  const { t, formatDateTime, formatPercent } = useI18n();
  const funnelQuery = useReportFunnel(filters);
  const funnel = funnelQuery.data;
  const selectedStage = funnel?.stages.find((stage) => stage.key.toLowerCase() === dimension?.toLowerCase());
  return <Modal open={open} onClose={onClose} title={t('reports.funnelDetail.title')} size="lg">
    {funnelQuery.isPending ? <LoadingState label={t('reports.detail.loading')} /> : funnelQuery.error ? <ErrorState message={t('reports.detail.loadError')} onRetry={() => void funnelQuery.refetch()} /> : funnel ? <div className="space-y-5">
      <p className="text-sm leading-6 text-text-muted">{t('reports.funnelDetail.description')}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-muted"><span>{t('reports.detail.updatedAt')} <strong className="text-text">{formatDateTime(funnel.asOf)}</strong></span></div>
      {selectedStage ? <p className="rounded-lg border border-accent/30 bg-[#f7fbff] px-3 py-2 text-sm font-semibold text-accent">{selectedStage.label} · {formatPercent(metricRate(selectedStage.numerator, selectedStage.denominator))}</p> : null}
      <FunnelChart stages={funnel.stages} />
      <section className="space-y-3"><h3 className="text-base font-bold text-text">{t('reports.detail.breakdown')}</h3><FunnelTableInModal stages={funnel.stages} asOf={funnel.asOf} /></section>
    </div> : <EmptyState title={t('reports.funnelDetail.noData')} />}
  </Modal>;
}
