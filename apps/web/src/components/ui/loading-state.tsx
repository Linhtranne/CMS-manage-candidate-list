export function LoadingState({ label = 'Đang tải dữ liệu' }: { label?: string }) {
  return (
    <div className="cms-loading-pulse rounded-lg border border-border bg-panel p-8 text-center text-sm text-text-muted" role="status" aria-live="polite">
      {label}
    </div>
  );
}
