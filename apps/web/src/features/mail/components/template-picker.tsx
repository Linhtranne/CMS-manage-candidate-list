'use client';

import { useI18n } from '@/i18n/use-i18n';
import { LoadingState } from '@/components/ui/loading-state';
import { useMailTemplates, type MailboxEmailTemplate } from '../services/mail-queries';

export function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string, template?: MailboxEmailTemplate) => void }) {
  const { t } = useI18n();
  const query = useMailTemplates();
  const templates = query.data?.items ?? [];
  return <label className="block text-sm font-semibold text-text">{t('mailbox.template.label')}<select aria-label={t('mailbox.template.aria')} name="mail-template" value={value} onChange={(event) => { const selected = templates.find((template) => template.id === event.target.value); onChange(event.target.value, selected); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('mailbox.template.none')}</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>{query.isPending ? <LoadingState label={t('common.states.loading')} /> : null}</label>;
}
