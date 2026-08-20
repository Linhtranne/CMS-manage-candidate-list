import type { components } from '@cms/contracts';
import { useI18n } from '@/i18n/use-i18n';

type Conversation = components['schemas']['Conversation'];
export function ConversationContext({ conversation }: { conversation: Conversation }) {
  const { t } = useI18n();
  return <aside className="rounded-lg border border-border bg-surface p-4" aria-label={t('mailbox.context.aria')}><h3 className="font-bold text-text">{t('mailbox.context.title')}</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-text-muted">{t('mailbox.context.candidate')}</dt><dd className="font-semibold text-text">{conversation.candidate.name}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">{t('candidates.table.code')}</dt><dd className="font-semibold text-text">{conversation.candidate.code}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">{t('mailbox.context.application')}</dt><dd className="font-semibold text-text">{conversation.applicationId ?? t('mailbox.context.unlinked')}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">{t('mailbox.context.journey')}</dt><dd className="font-semibold text-text">{conversation.journeyId ?? t('mailbox.context.unlinked')}</dd></div></dl></aside>;
}
