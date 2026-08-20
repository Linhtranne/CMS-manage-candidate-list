'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { emailStatusLabel } from '../domain/email-status-label';
import { ComposerModal } from './composer-modal';
import { ConversationContext } from './conversation-context';
import { AttachmentRow } from './attachment-row';
import { LinkConversationDialog } from './link-conversation-dialog';
import { useI18n } from '@/i18n/use-i18n';

type Conversation = components['schemas']['ConversationDetail'];
export function ConversationThread({ conversation, onRefetch }: { conversation: Conversation; onRefetch?: () => void }) {
  const { t, formatDateTime } = useI18n();
  const [replying, setReplying] = useState(false);
  const [linking, setLinking] = useState(false);
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><section className="space-y-4"><header className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-accent">{t('mailbox.thread.mailboxCount', { count: conversation.messageCount })}</p><h2 className="mt-1 text-xl font-bold text-text">{conversation.subject}</h2><p className="mt-1 text-sm text-text-muted">{t('mailbox.thread.updated', { date: formatDateTime(conversation.lastActivityAt), version: conversation.version })}</p></div><div className="flex flex-wrap gap-2">{conversation.status === 'UNMATCHED' ? <Button variant="secondary" onClick={() => setLinking(true)}>{t('mailbox.thread.link')}</Button> : null}<Button variant="primary" onClick={() => setReplying(true)}>{t('mailbox.thread.reply')}</Button></div></div></header>{conversation.messages.map((message) => <article key={message.id} className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-text">{message.direction === 'INBOUND' ? message.from : 'ungvien@company.vn'}</p><p className="text-xs text-text-muted">{message.direction === 'INBOUND' ? t('mailbox.thread.inbound') : t('mailbox.thread.outbound')} · {formatDateTime(message.sentOrReceivedAt)}</p></div><StatusLabel tone={message.status === 'BOUNCED' || message.status === 'FAILED' ? 'danger' : message.status === 'SENT' ? 'success' : 'info'}>{emailStatusLabel(message.status, t)}</StatusLabel></div><div className="mt-4 text-sm leading-6 text-text">{message.sanitizedHtml ? <div dangerouslySetInnerHTML={{ __html: message.sanitizedHtml }} /> : <p className="whitespace-pre-wrap">{message.bodyText}</p>}</div></article>)}{conversation.attachments.length ? <section className="rounded-lg border border-border bg-panel p-5"><h3 className="font-bold text-text">{t('mailbox.thread.attachments')}</h3><ul className="mt-3 space-y-2">{conversation.attachments.map((attachment) => <AttachmentRow key={attachment.id} attachment={attachment} />)}</ul></section> : null}{conversation.internalNotes.length ? <section className="rounded-lg border border-[#f4d6a3] bg-[#fff8e8] p-5"><h3 className="font-bold text-text">{t('mailbox.thread.notes')}</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">{conversation.internalNotes.map((note) => <li key={note}>{note}</li>)}</ul></section> : null}<ComposerModal open={replying} conversation={conversation} onClose={() => setReplying(false)} onRefetch={() => { onRefetch?.(); }} /></section><ConversationContext conversation={conversation} /><LinkConversationDialog conversation={conversation} open={linking} onClose={() => { setLinking(false); onRefetch?.(); }} /></div>;
}
