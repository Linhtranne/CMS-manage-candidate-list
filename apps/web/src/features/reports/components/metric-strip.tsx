import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { formatMetricValue } from '../domain/metric';

type ReportMetric = components['schemas']['ReportMetric'];

export function MetricLink({ metric }: { metric: ReportMetric }) {
  return <Link href={metric.drilldownHref as Route} className="group block rounded-lg border border-border bg-panel p-4 transition-colors hover:border-accent hover:bg-[#f7fbff]" aria-label={`${metric.label} ${formatMetricValue(metric)}`}><strong className="block text-2xl font-bold text-text group-hover:text-accent">{formatMetricValue(metric)}</strong><span className="mt-1 block text-sm text-text-muted">{metric.label}</span></Link>;
}

export function MetricStrip({ metrics }: { metrics: ReportMetric[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricLink key={metric.key} metric={metric} />)}</div>;
}
