import type { components } from '@cms/contracts';
import { MetricStrip } from './metric-strip';

type ReportMetric = components['schemas']['ReportMetric'];

export function ReportSection({ title, description, metrics }: { title: string; description: string; metrics: ReportMetric[] }) {
  return <section className="space-y-3 rounded-lg border border-border bg-panel p-5"><div><h2 className="font-bold text-text">{title}</h2><p className="mt-1 text-sm text-text-muted">{description}</p></div><MetricStrip metrics={metrics} /></section>;
}
