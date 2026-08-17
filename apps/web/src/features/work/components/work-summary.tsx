import type { WorkSummary } from '../types';

type Props = { summary: WorkSummary; activeView: string; onSelect: (view: string) => void };

const items = [
  ['overdue', 'Quá hạn', 'overdue'],
  ['today', 'Phỏng vấn hôm nay', 'today'],
  ['waitingReply', 'Chờ phản hồi', 'waiting-reply'],
  ['unresolvedEmail', 'Email chưa xử lý', 'email'],
  ['journeyRisk', 'Lộ trình có rủi ro', 'journey-risk']
] as const;

export function WorkSummary({ summary, activeView, onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Chỉ số công việc">
      {items.map(([key, label, view]) => (
        <button key={key} type="button" aria-label={`${label} ${summary[key]}`} aria-pressed={activeView === view} onClick={() => onSelect(view)} className="rounded-lg border border-border bg-panel p-4 text-left shadow-panel transition hover:border-accent hover:bg-surface aria-pressed:border-accent aria-pressed:bg-[#e8f1fb]">
          <span className="block text-2xl font-bold text-text">{summary[key]}</span>
          <span className="mt-1 block text-sm text-text-muted">{label}</span>
        </button>
      ))}
    </div>
  );
}
