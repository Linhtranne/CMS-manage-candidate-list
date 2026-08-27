import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';
import { getReportMetricLabel } from '../domain/report-labels';
import { metricRate } from '../domain/metric';
import { funnelRecordsHref, reportRecordsHref } from '../domain/report-drilldown';

type ReportMetric = components['schemas']['ReportMetric'];
type FunnelStage = components['schemas']['ReportFunnelStage'];

function metricChartValue(metric: ReportMetric): number {
  if (metric.numerator !== undefined) return metric.numerator;
  return metric.unit === 'PERCENT' ? metric.value * 100 : metric.value;
}

export function ReportBarChart({ code, metrics }: { code: string; metrics: ReportMetric[] }) {
  const { t, formatNumber, formatPercent } = useI18n();
  const max = Math.max(...metrics.map(metricChartValue), 1);
  return (
    <section className="rounded-xl border border-border bg-panel p-4 sm:p-5" aria-labelledby={`${code}-chart-title`}>
      <h2 id={`${code}-chart-title`} className="text-base font-bold text-text sm:text-lg">{t('reports.detail.chart')}</h2>
      {metrics.length ? (
        <div className="mt-5 space-y-4">
          {metrics.map((metric) => {
            const amount = metricChartValue(metric);
            const label = getReportMetricLabel(t, metric.key, metric.label);
            const value = metric.numerator !== undefined && metric.denominator !== undefined
              ? `${formatNumber(metric.numerator)}/${formatNumber(metric.denominator)} · ${formatPercent(metricRate(metric.numerator, metric.denominator))}`
              : metric.unit === 'PERCENT' ? formatPercent(metric.value) : formatNumber(metric.value);
            return (
              <div key={metric.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-text" title={label}>{label}</span>
                  <span className="shrink-0 text-text-muted">{value}</span>
                </div>
                <Link href={reportRecordsHref(code, metric.key) as Route} className="block rounded-full bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" aria-label={`${label}: ${value}`}>
                  <span className="block h-3 rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(4, Math.round((amount / max) * 100))}%` }} />
                </Link>
              </div>
            );
          })}
        </div>
      ) : <p className="mt-4 text-sm text-text-muted">{t('reports.detail.noRows')}</p>}
    </section>
  );
}

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const { t, formatNumber, formatPercent } = useI18n();
  const max = Math.max(...stages.map((stage) => stage.numerator), 1);
  return (
    <section className="rounded-xl border border-border bg-panel p-4 sm:p-5" aria-labelledby="funnel-chart-title">
      <h2 id="funnel-chart-title" className="text-base font-bold text-text sm:text-lg">{t('reports.funnelDetail.chart')}</h2>
      {stages.length ? (
        <div className="mt-5 space-y-3">
          {stages.map((stage) => (
            <div key={stage.key} className="grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,2fr)_auto] items-center gap-3 text-sm">
              <span className="truncate font-semibold text-text" title={stage.label}>{stage.label}</span>
              <Link href={funnelRecordsHref(stage.key) as Route} className="block rounded-full bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" aria-label={`${stage.label}: ${formatNumber(stage.numerator)}/${formatNumber(stage.denominator)}`}>
                <span className="block h-7 rounded-full bg-accent/80 px-3 text-right text-xs font-bold leading-7 text-white transition-[width] duration-300" style={{ width: `${Math.max(12, Math.round((stage.numerator / max) * 100))}%` }}>{formatNumber(stage.numerator)}</span>
              </Link>
              <span className="whitespace-nowrap text-right text-text-muted">{formatPercent(metricRate(stage.numerator, stage.denominator))}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-4 text-sm text-text-muted">{t('reports.funnelDetail.noData')}</p>}
    </section>
  );
}
