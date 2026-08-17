import { type ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-panel p-8 text-center" aria-label={title}>
      <h2 className="text-base font-semibold text-text">{title}</h2>
      {description ? <p className="mt-2 text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
