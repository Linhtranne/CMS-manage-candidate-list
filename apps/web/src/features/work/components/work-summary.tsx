import type { WorkSummary } from '../types';
import { useI18n } from '@/i18n/use-i18n';

type Props = { summary: WorkSummary; activeView: string; onSelect: (view: string) => void };

const items = [
  ['overdue', 'work.summary.overdue', 'overdue'],
  ['today', 'work.summary.interviewsToday', 'today'],
  ['waitingReply', 'work.summary.waitingReply', 'waiting-reply'],
  ['unresolvedEmail', 'work.summary.unresolvedEmail', 'email'],
  ['journeyRisk', 'work.summary.journeyRisk', 'journey-risk']
] as const;

export function WorkSummary({ summary, activeView, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={t('work.summary.aria')}>
      {items.map(([key, labelKey, view]) => (
        <button key={key} type="button" aria-label={`${t(labelKey)} ${summary[key]}`} aria-pressed={activeView === view} onClick={() => onSelect(view)} className="rounded-lg border border-border bg-panel p-4 text-left shadow-panel transition hover:border-accent hover:bg-surface aria-pressed:border-accent aria-pressed:bg-[#e8f1fb]">
          <span className="block text-2xl font-bold text-text">{summary[key]}</span>
          <span className="mt-1 block text-sm text-text-muted">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
