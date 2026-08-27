import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { metricRate } from '../domain/metric';
import { reportFunnelDrilldownHref } from '../domain/report-drilldown';

type FunnelStage = components['schemas']['ReportFunnelStage'];

export function FunnelTable({ stages, asOf, onOpenStage }: { stages: FunnelStage[]; asOf?: string; onOpenStage?: (stage: FunnelStage) => void }) {
  const { t, formatDateTime, formatNumber, formatPercent } = useI18n();
  const updatedAt = asOf ? formatDateTime(asOf) : t('reports.funnel.updated');
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-panel p-4 sm:p-5">
      <h2 className="text-base font-bold tracking-[-0.01em] text-text sm:text-lg">{t('reports.funnel.title')}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="sr-only">{t('reports.funnel.title')}</caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-text-muted">
              <th className="px-3 py-3 font-semibold">{t('reports.funnel.stage')}</th>
              <th className="px-3 py-3 font-semibold">{t('reports.funnel.count')}</th>
              <th className="px-3 py-3 font-semibold">{t('reports.funnel.rate')}</th>
              <th className="px-3 py-3 font-semibold">{t('reports.funnel.updated')}</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => {
              const rate = metricRate(stage.numerator, stage.denominator);
              return (
                <tr key={stage.key} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-semibold text-text">{getDomainLabel(t, 'reportFunnelStage', stage.key)}</td>
                  <td className="px-3 py-3">{onOpenStage ? <button type="button" className="font-semibold text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => onOpenStage(stage)}>{formatNumber(stage.numerator)}/{formatNumber(stage.denominator)}</button> : <Link className="font-semibold text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={reportFunnelDrilldownHref(stage) as Route}>{formatNumber(stage.numerator)}/{formatNumber(stage.denominator)}</Link>}</td>
                  <td className="px-3 py-3 text-text-muted">{formatPercent(rate)}</td>
                  <td className="px-3 py-3 text-text-muted"><time dateTime={asOf}>{updatedAt}</time></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
