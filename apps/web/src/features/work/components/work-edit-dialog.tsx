'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { getDomainLabel } from '@/i18n/domain-labels';
import { occupationLabel } from '@/i18n/catalog-options';
import { LoadingState } from '@/components/ui/loading-state';
import { useWorkAssignees } from '../services/work-queries';

type WorkItem = components['schemas']['WorkItem'];
type EditMode = 'due' | 'assignee';

export function WorkEditDialog({ mode, item, open, isSaving, error, onClose, onSave }: { mode: EditMode; item: WorkItem; open: boolean; isSaving?: boolean; error?: string; onClose: () => void; onSave: (value: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const assignees = useWorkAssignees(open && mode === 'assignee');

  useEffect(() => {
    if (!open) return;
    if (mode === 'due') {
      const date = new Date(item.dueAt);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      setValue(local);
    } else {
      setValue(item.assignee.id);
    }
  }, [item, mode, open]);

  const title = mode === 'due' ? t('work.edit.dueTitle') : t('work.edit.assigneeTitle');
  return <Modal open={open} title={title} onClose={onClose} size="sm" footer={<><Button variant="secondary" onClick={onClose}>{t('common.actions.cancel')}</Button><Button variant="primary" disabled={!value || isSaving} onClick={() => onSave(value)}>{isSaving ? t('common.savedViews.saving') : t('work.edit.saveChanges')}</Button></>}>
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-muted"><strong className="text-text">{getDomainLabel(t, 'workTask', item.title)}</strong><p className="mt-1">{item.candidate.name} · {occupationLabel(t, item.order.position)}</p></div>
      <label className="block text-sm font-semibold text-text">{mode === 'due' ? t('work.edit.dueLabel') : t('work.edit.assigneeLabel')}
        {mode === 'due' ? <input aria-label={t('work.edit.dueLabel')} name="work-due-edit" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /> : assignees.isPending ? <LoadingState label={t('common.states.loading')} /> : <select aria-label={t('work.edit.assigneeLabel')} name="work-assignee-edit" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal">{assignees.data?.items.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.displayName}</option>)}</select>}
      </label>
      {error ? <p role="alert" className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-3 text-sm text-danger">{error}</p> : null}
    </div>
  </Modal>;
}
