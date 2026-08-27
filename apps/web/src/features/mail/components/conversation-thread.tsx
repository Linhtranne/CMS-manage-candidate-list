'use client';

import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';
import { emailStatusLabel } from '../domain/email-status-label';
import { ConversationContext } from './conversation-context';
import { AttachmentRow } from './attachment-row';
import { useI18n } from '@/i18n/use-i18n';

type Conversation = components['schemas']['ConversationDetail'];
export function ConversationThread({ conversation }: { conversation: Conversation }) {
  const { t, formatDateTime } = useI18n();
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><section className="space-y-4"><header className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-accent">{t('mailbox.thread.mailboxCount', { count: conversation.messageCount })}</p><h2 className="mt-1 text-xl font-bold text-text">{conversation.subject}</h2><p className="mt-1 text-sm text-text-muted">{t('mailbox.thread.updated', { date: formatDateTime(conversation.lastActivityAt), version: conversation.version })}</p></div></div></header>{conversation.messages.map((message) => <article key={message.id} className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-text">{message.from}</p><p className="text-xs text-text-muted">{message.direction === 'INBOUND' ? t('mailbox.thread.inbound') : t('mailbox.thread.outbound')} · {formatDateTime(message.sentOrReceivedAt)}</p></div><StatusLabel tone={message.status === 'BOUNCED' || message.status === 'FAILED' ? 'danger' : message.status === 'SENT' ? 'success' : 'info'}>{emailStatusLabel(message.status, t)}</StatusLabel></div><div className="mt-4 text-sm leading-6 text-text">{message.sanitizedHtml ? <div dangerouslySetInnerHTML={{ __html: message.sanitizedHtml }} /> : <p className="whitespace-pre-wrap">{message.bodyText}</p>}</div></article>)}{conversation.attachments.length ? <section className="rounded-lg border border-border bg-panel p-5"><h3 className="font-bold text-text">{t('mailbox.thread.attachments')}</h3><ul className="mt-3 space-y-2">{conversation.attachments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} />)}</ul></section> : null}{conversation.internalNotes.length ? <section className="rounded-lg border border-[#f4d6a3] bg-[#fff8e8] p-5"><h3 className="font-bold text-text">{t('mailbox.thread.notes')}</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">{conversation.internalNotes.map((note) => <li key={note}>{note}</li>)}</ul></section> : null}</section><ConversationContext conversation={conversation} /></div>;
}
