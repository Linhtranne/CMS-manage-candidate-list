'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@/lib/auth/types';
import { listViews, saveView } from '@/services/saved-view-service';
import { Button } from './button';
import { useI18n } from '@/i18n/use-i18n';

export function SavedViewMenu({ resource, user, query = {}, onApply }: { resource: string; user: CurrentUser; query?: Record<string, string | string[]>; onApply?: (query: Record<string, string | string[]>) => void }) {
  const { t } = useI18n();
  const [visibility, setVisibility] = useState<'PRIVATE' | 'TEAM'>('PRIVATE');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const views = useQuery({ queryKey: ['saved-views', resource], queryFn: () => listViews(resource) });
  const canPublish = user.roles.includes('MANAGER') || user.permissions.includes('admin.read');
  const submit = async () => {
    if (!name.trim()) { setStatus('error'); return; }
    setStatus('saving');
    try {
      await saveView({ resource, name: name.trim(), query, visibility });
      setName('');
      setStatus('saved');
      await views.refetch();
    } catch {
      setStatus('error');
    }
  };

  return <div className="flex flex-wrap items-center gap-2" data-resource={resource}>
      <label htmlFor={`${resource}-view-name`} className="sr-only">{t('common.savedViews.name')}</label>
      <input id={`${resource}-view-name`} name={`${resource}-view-name`} aria-label={t('common.savedViews.name')} value={name} onChange={(event) => { setName(event.target.value); setStatus('idle'); }} placeholder={t('common.savedViews.name')} className="min-h-9 w-36 rounded-control border border-border bg-panel px-3 text-sm" />
      {views.data?.items.length ? <label htmlFor={`${resource}-saved-view`} className="sr-only">{t('common.savedViews.saved')}</label> : null}
      {views.data?.items.length ? <select id={`${resource}-saved-view`} name={`${resource}-saved-view`} aria-label={t('common.savedViews.chooseSaved')} defaultValue="" onChange={(event) => { const selected = views.data?.items.find((item) => item.id === event.target.value); if (selected) onApply?.(selected.query); }} className="min-h-9 max-w-48 rounded-control border border-border bg-panel px-3 text-sm"><option value="">{t('common.savedViews.saved')}</option>{views.data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
      <label htmlFor={`${resource}-view-visibility`} className="text-sm text-text-muted">{t('common.savedViews.saveView')}</label>
      <select id={`${resource}-view-visibility`} name={`${resource}-view-visibility`} aria-label={t('common.savedViews.scope')} value={visibility} onChange={(event) => setVisibility(event.target.value as 'PRIVATE' | 'TEAM')} className="min-h-9 rounded-control border border-border bg-panel px-3 text-sm">
        <option value="PRIVATE">{t('common.savedViews.private')}</option>
        {canPublish ? <option value="TEAM">{t('common.savedViews.team')}</option> : null}
      </select>
      <Button variant="secondary" size="sm" disabled={status === 'saving'} onClick={() => void submit()}>{status === 'saving' ? t('common.savedViews.saving') : t('common.actions.save')}</Button>
      {status === 'saved' ? <span role="status" className="text-xs font-semibold text-success">{t('common.savedViews.savedConfirmation')}</span> : null}
      {status === 'error' ? <span role="alert" className="text-xs text-danger">{t('common.savedViews.nameRequired')}</span> : null}
    </div>;
}
