import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';
import { formatMetricValue } from '../domain/metric';
import { getReportMetricLabel } from '../domain/report-labels';
import { reportMetricDrilldownHref } from '../domain/report-drilldown';

type ReportMetric = components['schemas']['ReportMetric'];

export function MetricLink({ metric, onOpen }: { metric: ReportMetric; onOpen?: (metric: ReportMetric) => void }) {
  const { t, formatNumber, formatPercent } = useI18n();
  const value = formatMetricValue(metric, { days: t('metrics.days'), minutes: t('metrics.minutes'), formatNumber, formatPercent });
  const label = getReportMetricLabel(t, metric.key, metric.label);
  const className = 'group flex min-h-28 min-w-0 flex-col justify-between rounded-xl border border-border bg-panel p-4 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-accent hover:bg-[#f7fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
  const content = <><span className="min-w-0 break-words text-sm font-semibold leading-5 text-text-muted group-hover:text-text">{label}</span><strong className="mt-5 break-words text-2xl font-bold tracking-[-0.02em] text-text group-hover:text-accent">{value}</strong></>;
  return onOpen ? <button type="button" className={className} onClick={() => onOpen(metric)} aria-label={`${label} ${value}`}>{content}</button> : <Link href={reportMetricDrilldownHref(metric) as Route} className={className} aria-label={`${label} ${value}`}>{content}</Link>;
}

export function MetricStrip({ metrics, onOpenMetric }: { metrics: ReportMetric[]; onOpenMetric?: (metric: ReportMetric) => void }) {
  return <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))' }}>{metrics.map((metric) => <MetricLink key={metric.key} metric={metric} onOpen={onOpenMetric} />)}</div>;
}
