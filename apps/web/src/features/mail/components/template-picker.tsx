import { useI18n } from '@/i18n/use-i18n';

export const mailTemplates = [
  { id: 'INTERVIEW_INVITATION', key: 'mailbox.template.interview', requiredContext: 'interviewTime' },
  { id: 'DOCUMENT_REQUEST', key: 'mailbox.template.documents', requiredContext: null },
  { id: 'RESULT_NOTICE', key: 'mailbox.template.result', requiredContext: null }
] as const;

export function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return <label className="block text-sm font-semibold text-text">{t('mailbox.template.label')}<select aria-label={t('mailbox.template.aria')} name="mail-template" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('mailbox.template.none')}</option>{mailTemplates.map((template) => <option key={template.id} value={template.id}>{t(template.key)}</option>)}</select></label>;
}
