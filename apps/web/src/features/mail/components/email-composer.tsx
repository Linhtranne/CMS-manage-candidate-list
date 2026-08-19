'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useSendEmail } from '../services/mail-queries';
import { TemplatePicker, mailTemplates } from './template-picker';
import { SendStatus } from './send-status';
import { ReplyConflictAlert } from './reply-conflict-alert';

type Conversation = components['schemas']['ConversationDetail'];
export function EmailComposer({ conversation, onCancel, onDirtyChange, showHeader = true }: { conversation: Conversation; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; showHeader?: boolean }) {
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
    if (template?.requiredContext === 'interviewTime' && !conversation.applicationId) { setError('Thiếu thời gian phỏng vấn'); return; }
    if (!to.trim() || !subject.trim() || !body.trim()) { setError('Cần nhập người nhận, tiêu đề và nội dung.'); return; }
    setError('');
      try { const response = await mutation.mutateAsync({ conversationId: conversation.id, body: { to: to.split(',').map((item) => item.trim()).filter(Boolean), cc: cc.split(',').map((item) => item.trim()).filter(Boolean), subject, body, templateId: templateId || null, attachmentIds: attachments.map((file) => `local-${file.name}`), idempotencyKey: `draft-${conversation.id}-${Date.now()}`, version: conversation.version } }); window.localStorage.removeItem(draftKey); onDirtyChange?.(false); setResult(response); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xếp hàng gửi email'); }
  };
  const saveDraft = () => { window.localStorage.setItem(draftKey, JSON.stringify({ to, cc, subject, body, templateId, attachmentNames: attachments.map((file) => file.name) })); setDraftSaved(true); onDirtyChange?.(false); setError(''); };
  if (result) return <section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between"><h3 className="font-bold text-text">Kết quả gửi email</h3><SendStatus status={result.status} /></div><p className="mt-3 text-sm text-text-muted">Email đã được ghi nhận trong lịch sử với mã {result.messageId}.</p><div className="mt-4 flex justify-end"><Button variant="secondary" onClick={onCancel}>Đóng</Button></div></section>;
  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>{showHeader ? <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-text">Soạn email trả lời</h3><p className="mt-1 text-sm text-text-muted">From: ungvien@company.vn · thư đã gửi sẽ không sửa được.</p></div><Button type="button" variant="ghost" onClick={onCancel}>Đóng</Button></div> : null}<label className="block text-sm font-semibold text-text">Người nhận<input aria-label="Người nhận" name="nguoi-nhan" value={to} onChange={(event) => { setTo(event.target.value); markDirty(); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">Cc<input aria-label="Cc email" name="cc-email" value={cc} onChange={(event) => { setCc(event.target.value); markDirty(); }} placeholder="Có thể bỏ trống" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><TemplatePicker value={templateId} onChange={(value) => { setTemplateId(value); markDirty(); }} /><label className="block text-sm font-semibold text-text">Tiêu đề<input aria-label="Tiêu đề email" name="tieu-de-email" value={subject} onChange={(event) => { setSubject(event.target.value); markDirty(); }} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label>{preview ? <section className="rounded-lg border border-border bg-panel p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Xem trước</p><h4 className="mt-2 font-semibold text-text">{subject || 'Chưa có tiêu đề'}</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text">{body || 'Chưa có nội dung'}</p></section> : <label className="block text-sm font-semibold text-text">Nội dung<textarea aria-label="Nội dung" name="noi-dung" value={body} onChange={(event) => { setBody(event.target.value); markDirty(); }} className="mt-1 min-h-32 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>}<label className="block text-sm font-semibold text-text">Tệp đính kèm<input aria-label="Tệp đính kèm" name="tep-dinh-kem" type="file" multiple onChange={(event) => { setAttachments(Array.from(event.target.files ?? [])); markDirty(); }} className="mt-1 block w-full rounded-control border border-border bg-panel px-3 py-2 text-sm font-normal" /></label>{attachments.length ? <ul className="rounded-lg border border-border bg-panel px-4 py-2 text-sm text-text-muted">{attachments.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}</ul> : null}{error ? <ReplyConflictAlert message={error} /> : null}{draftSaved ? <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">Đã lưu bản nháp trên trình duyệt · {new Date().toLocaleTimeString('vi-VN')}</p> : null}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPreview((value) => !value)}>{preview ? 'Sửa nội dung' : 'Xem trước'}</Button><Button type="button" variant="secondary" onClick={saveDraft}>Lưu bản nháp</Button><Button type="submit" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang gửi' : 'Gửi email'}</Button></div></form>;
}
