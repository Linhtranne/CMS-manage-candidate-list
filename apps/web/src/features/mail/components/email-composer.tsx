'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useSendEmail } from '../services/mail-queries';
import { TemplatePicker, mailTemplates } from './template-picker';
import { SendStatus } from './send-status';
import { ReplyConflictAlert } from './reply-conflict-alert';

type Conversation = components['schemas']['ConversationDetail'];
export function EmailComposer({ conversation, onCancel, showHeader = true }: { conversation: Conversation; onCancel?: () => void; showHeader?: boolean }) {
  const mutation = useSendEmail();
  const [to, setTo] = useState(conversation.messages.find((message) => message.direction === 'INBOUND')?.from ?? '');
  const [subject, setSubject] = useState(conversation.subject.startsWith('Re:') ? conversation.subject : `Re: ${conversation.subject}`);
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<components['schemas']['EmailSendResult']>();
  const submit = async () => {
    const template = mailTemplates.find((item) => item.id === templateId);
    if (template?.requiredContext === 'interviewTime' && !conversation.applicationId) { setError('Thiếu thời gian phỏng vấn'); return; }
    if (!to.trim() || !subject.trim() || !body.trim()) { setError('Cần nhập người nhận, tiêu đề và nội dung.'); return; }
    setError('');
    try { const response = await mutation.mutateAsync({ conversationId: conversation.id, body: { to: to.split(',').map((item) => item.trim()).filter(Boolean), cc: [], subject, body, templateId: templateId || null, attachmentIds: [], idempotencyKey: `draft-${conversation.id}-${Date.now()}`, version: conversation.version } }); setResult(response); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xếp hàng gửi email'); }
  };
  if (result) return <section className="rounded-lg border border-border bg-surface p-5"><div className="flex items-center justify-between"><h3 className="font-bold text-text">Kết quả gửi email</h3><SendStatus status={result.status} /></div><p className="mt-3 text-sm text-text-muted">Email đã được ghi nhận trong lịch sử với mã {result.messageId}.</p><div className="mt-4 flex justify-end"><Button variant="secondary" onClick={onCancel}>Đóng</Button></div></section>;
  return <form className="space-y-4 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>{showHeader ? <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-text">Soạn email trả lời</h3><p className="mt-1 text-sm text-text-muted">From: ungvien@company.vn · thư đã gửi sẽ không sửa được.</p></div><Button type="button" variant="ghost" onClick={onCancel}>Đóng</Button></div> : null}<label className="block text-sm font-semibold text-text">Người nhận<input aria-label="Người nhận" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><TemplatePicker value={templateId} onChange={setTemplateId} /><label className="block text-sm font-semibold text-text">Tiêu đề<input aria-label="Tiêu đề email" value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">Nội dung<textarea aria-label="Nội dung" value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-32 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>{error ? <ReplyConflictAlert message={error} /> : null}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Lưu bản nháp</Button><Button type="submit" variant="primary" disabled={mutation.isPending}>Gửi email</Button></div></form>;
}
