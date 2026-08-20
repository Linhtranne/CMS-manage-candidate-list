import Link from 'next/link';
import type { Route } from 'next';
import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';

type FunnelStage = components['schemas']['ReportFunnelStage'];

export function FunnelTable({ stages }: { stages: FunnelStage[] }) {
  const { t } = useI18n();
  return <section className="rounded-lg border border-border bg-panel p-5"><div><h2 className="font-bold text-text">{t('reports.funnel.title')}</h2><p className="mt-1 text-sm text-text-muted">{t('reports.funnel.description')}</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[38rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3">{t('reports.funnel.stage')}</th><th className="px-3 py-3">{t('reports.funnel.count')}</th><th className="px-3 py-3">{t('reports.funnel.rate')}</th><th className="px-3 py-3">{t('reports.funnel.updated')}</th></tr></thead><tbody>{stages.map((stage) => <tr key={stage.key} className="border-b border-border last:border-0"><td className="px-3 py-3 font-semibold text-text">{getDomainLabel(t, 'reportFunnelStage', stage.key)}</td><td className="px-3 py-3"><Link className="font-semibold text-accent underline" href={stage.drilldownHref as Route}>{stage.numerator}/{stage.denominator}</Link></td><td className="px-3 py-3 text-text-muted">{Math.round(stage.rate * 100)}%</td><td className="px-3 py-3 text-text-muted">{t('reports.funnel.updated')}</td></tr>)}</tbody></table></div></section>;
}
