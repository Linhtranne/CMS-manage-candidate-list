'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useSendEmail } from '../services/mail-queries';
import { TemplatePicker, mailTemplates } from './template-picker';
import { SendStatus } from './send-status';
import { ReplyConflictAlert } from './reply-conflict-alert';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';

type Conversation = components['schemas']['ConversationDetail'];
export function EmailComposer({ conversation, onCancel, onDirtyChange, showHeader = true }: { conversation: Conversation; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; showHeader?: boolean }) {
  const { t, formatTime } = useI18n();
  const mutation = useSendEmail();
  const [to, setTo] = useState(conversation.messages.find((message) => message.direction === 'INBOUND')?.from ?? '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(conversation.subject.startsWith('Re:') ? conversation.subject : `Re: ${conversation.subject}`);
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<components['schemas']['EmailSendResult']>();
  const draftKey = `cms-mail-draft-${conversation.id}`;

  const markDirty = () => { setDraftSaved(false); onDirtyChange?.(true); };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return;
      const draft = JSON.parse(saved) as { to?: string; cc?: string; subject?: string; body?: string; templateId?: string; attachmentNames?: string[] };
      if (draft.to) setTo(draft.to);
      if (draft.cc) setCc(draft.cc);
      if (draft.subject) setSubject(draft.subject);
      if (draft.body) setBody(draft.body);
      if (draft.templateId) setTemplateId(draft.templateId);
      if (draft.attachmentNames?.length) setAttachments(draft.attachmentNames.map((name) => new File([], name)));
      setDraftSaved(true);
      onDirtyChange?.(false);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, onDirtyChange]);
  const submit = async () => {
    const template = mailTemplates.find((item) => item.id === templateId);
    if (template?.requiredContext === 'interviewTime' && !conversation.applicationId) { setError(t('mailbox.composer.missingInterviewTime')); return; }
    if (!to.trim() || !subject.trim() || !body.trim()) { setError(t('mailbox.composer.required')); return; }
    setError('');
      try { const response = await mutation.mutateAsync({ conversationId: conversation.id, body: { to: to.split(',').map((item) => item.trim()).filter(Boolean), cc: cc.split(',').map((item) => item.trim()).filter(Boolean), subject, body, templateId: templateId || null, attachmentIds: attachments.map((file) => `local-${file.name}`), idempotencyKey: `draft-${conversation.id}-${Date.now()}`, version: conversation.version } }); window.localStorage.removeItem(draftKey); onDirtyChange?.(false); setResult(response); } catch (cause) { setError(localizedError(t, cause, t('mailbox.composer.sendError'))); }
  };
  const saveDraft = () => { window.localStorage.setItem(draftKey, JSON.stringify({ to, cc, subject, body, templateId, attachmentNames: attachments.map((file) => file.name) })); setDraftSaved(true); onDirtyChange?.(false); setError(''); };
  if (result) return <section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between"><h3 className="font-bold text-text">{t('mailbox.composer.result')}</h3><SendStatus status={result.status} /></div><p className="mt-3 text-sm text-text-muted">{t('mailbox.composer.recorded', { id: result.messageId })}</p><div className="mt-4 flex justify-end"><Button variant="secondary" onClick={onCancel}>{t('mailbox.composer.close')}</Button></div></section>;
  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>{showHeader ? <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-text">{t('mailbox.composer.title')}</h3><p className="mt-1 text-sm text-text-muted">{t('mailbox.composer.sentNotEditable')}</p></div><Button type="button" variant="ghost" onClick={onCancel}>{t('mailbox.composer.close')}</Button></div> : null}<label className="block text-sm font-semibold text-text">{t('mailbox.composer.recipient')}<input aria-label={t('mailbox.composer.recipientAria')} name="mail-recipient" value={to} onChange={(event) => { setTo(event.target.value); markDirty(); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">{t('mailbox.composer.cc')}<input aria-label={t('mailbox.composer.ccAria')} name="mail-cc" value={cc} onChange={(event) => { setCc(event.target.value); markDirty(); }} placeholder={t('mailbox.composer.ccPlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><TemplatePicker value={templateId} onChange={(value) => { setTemplateId(value); markDirty(); }} /><label className="block text-sm font-semibold text-text">{t('mailbox.composer.subject')}<input aria-label={t('mailbox.composer.subjectAria')} name="mail-subject" value={subject} onChange={(event) => { setSubject(event.target.value); markDirty(); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>{preview ? <section className="rounded-lg border border-border bg-panel p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('mailbox.composer.preview')}</p><h4 className="mt-2 font-semibold text-text">{subject || t('mailbox.composer.noSubject')}</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">{body || t('mailbox.composer.noContent')}</p></section> : <label className="block text-sm font-semibold text-text">{t('mailbox.composer.content')}<textarea aria-label={t('mailbox.composer.contentAria')} name="mail-content" value={body} onChange={(event) => { setBody(event.target.value); markDirty(); }} className="mt-1 min-h-32 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>}<label className="block text-sm font-semibold text-text">{t('mailbox.composer.files')}<input aria-label={t('mailbox.composer.filesAria')} name="mail-files" type="file" multiple onChange={(event) => { setAttachments(Array.from(event.target.files ?? [])); markDirty(); }} className="mt-1 block w-full rounded-control border border-border bg-panel px-3 py-2 text-sm font-normal" /></label>{attachments.length ? <ul className="rounded-lg border border-border bg-panel px-4 py-2 text-sm text-text-muted">{attachments.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}</ul> : null}{error ? <ReplyConflictAlert message={error} /> : null}{draftSaved ? <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">{t('mailbox.composer.draftSaved', { time: formatTime(new Date()) })}</p> : null}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPreview((value) => !value)}>{preview ? t('mailbox.composer.edit') : t('mailbox.composer.preview')}</Button><Button type="button" variant="secondary" onClick={saveDraft}>{t('mailbox.composer.saveDraft')}</Button><Button type="submit" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? t('mailbox.composer.sending') : t('mailbox.composer.send')}</Button></div></form>;
}
