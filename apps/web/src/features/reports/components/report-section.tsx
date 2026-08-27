import type { components } from '@cms/contracts';
import { MetricStrip } from './metric-strip';
import { useI18n } from '@/i18n/use-i18n';

type ReportMetric = components['schemas']['ReportMetric'];

export function ReportSection({ title, metrics, onOpenMetric }: { title: string; metrics: ReportMetric[]; onOpenMetric?: (metric: ReportMetric) => void }) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 space-y-4 rounded-xl border border-border bg-panel p-4 sm:p-5">
      <h2 className="text-base font-bold tracking-[-0.01em] text-text sm:text-lg">{title}</h2>
      {metrics.length ? <MetricStrip metrics={metrics} onOpenMetric={onOpenMetric} /> : <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-text-muted">{t('reports.page.noMetrics')}</p>}
    </section>
  );
}
