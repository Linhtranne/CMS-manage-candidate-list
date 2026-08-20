import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { formatMetricValue } from '../domain/metric';

type ReportMetric = components['schemas']['ReportMetric'];

export function MetricLink({ metric }: { metric: ReportMetric }) {
  const { t, formatNumber, formatPercent } = useI18n();
  const value = formatMetricValue(metric, { days: t('metrics.days'), minutes: t('metrics.minutes'), formatNumber, formatPercent });
  const label = getDomainLabel(t, 'reportMetric', metric.key);
  return <Link href={metric.drilldownHref as Route} className="group block rounded-lg border border-border bg-panel p-4 transition-colors hover:border-accent hover:bg-[#f7fbff]" aria-label={`${label} ${value}`}><strong className="block text-2xl font-bold text-text group-hover:text-accent">{value}</strong><span className="mt-1 block text-sm text-text-muted">{label}</span></Link>;
}

export function MetricStrip({ metrics }: { metrics: ReportMetric[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricLink key={metric.key} metric={metric} />)}</div>;
}
