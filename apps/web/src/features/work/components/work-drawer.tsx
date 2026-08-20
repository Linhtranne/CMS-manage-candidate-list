'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useUpdateWorkItem, useWorkItem } from '../services/work-queries';
import { WorkActions } from './work-actions';
import { WorkEditDialog } from './work-edit-dialog';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { occupationLabel } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';

export function WorkDrawer({ workItemId, open, onClose }: { workItemId?: string; open: boolean; onClose: () => void }) {
  const { t, formatDateTime } = useI18n();
  const query = useWorkItem(workItemId);
  const mutation = useUpdateWorkItem();
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState<'due' | 'assignee'>();
  const item = query.data;

  return (
    <DetailDrawer open={open} title={t('work.drawer.title')} onClose={onClose}>
      {query.isPending ? <LoadingState /> : query.error || !item ? <ErrorState message={t('work.errors.detail')} onRetry={() => void query.refetch()} /> : (
        <div className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{t('work.drawer.source')}</p><p className="mt-2 font-semibold text-text">{getDomainLabel(t, 'workSource', item.sourceType)}</p><p className="mt-1 text-sm text-text-muted">{t('work.drawer.sourceCode')} {item.sourceType}</p></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-muted">{t('work.drawer.candidate')}</dt><dd className="mt-1 font-semibold">{item.candidate.code} · {item.candidate.name}</dd></div><div><dt className="text-text-muted">{t('work.drawer.order')}</dt><dd className="mt-1 font-semibold">{item.order.code} · {occupationLabel(t, item.order.position)}</dd></div><div><dt className="text-text-muted">{t('work.drawer.dueAt')}</dt><dd className="mt-1 font-semibold">{formatDateTime(item.dueAt)}</dd></div><div><dt className="text-text-muted">{t('work.drawer.assignee')}</dt><dd className="mt-1 font-semibold">{item.assignee.name}</dd></div></dl>
          <div className="rounded-lg border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('work.drawer.recentActivity')}</p><p className="mt-2 text-sm text-text">{item.lastActivity ?? t('work.drawer.noActivity')}</p>{item.notes ? <p className="mt-2 text-sm text-text-muted">{item.notes}</p> : null}</div>
          {mutation.error && (mutation.error as Error & { code?: string }).code === 'VERSION_CONFLICT' ? <div role="alert" className="space-y-2 rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-4"><p className="text-sm font-semibold text-danger">{t('work.drawer.conflict')}</p><Button variant="secondary" size="sm" onClick={() => void query.refetch()}>{t('work.drawer.reload')}</Button></div> : null}
          {success ? <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">{t('work.drawer.completed')}</p> : null}
          <div className="flex items-center gap-2"><StatusLabel tone={item.status === 'DONE' ? 'success' : 'info'}>{item.status === 'DONE' ? t('work.table.statuses.done') : t('work.drawer.waiting')}</StatusLabel><span className="text-xs text-text-muted">{t('work.drawer.version')} {item.version}</span></div>
          <WorkActions disabled={mutation.isPending || item.status === 'DONE'} sendEmailHref={`/mailbox?query=${encodeURIComponent(item.candidate.name)}`} onComplete={() => mutation.mutate({ id: item.id, body: { status: 'DONE', version: item.version } }, { onSuccess: () => setSuccess(true) })} onChangeDue={() => { setEditMode('due'); setSuccess(false); }} onChangeAssignee={() => { setEditMode('assignee'); setSuccess(false); }} />
          <WorkEditDialog mode={editMode ?? 'due'} item={item} open={Boolean(editMode)} isSaving={mutation.isPending} error={mutation.error ? localizedError(t, mutation.error, t('work.errors.create')) : undefined} onClose={() => setEditMode(undefined)} onSave={(value) => mutation.mutate({ id: item.id, body: editMode === 'due' ? { dueAt: new Date(value).toISOString(), version: item.version } : { assigneeId: value, version: item.version } }, { onSuccess: () => { setEditMode(undefined); setSuccess(false); } })} />
        </div>
      )}
    </DetailDrawer>
  );
}

