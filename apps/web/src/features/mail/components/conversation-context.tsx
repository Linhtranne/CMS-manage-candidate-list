import type { components } from '@cms/contracts';

type Conversation = components['schemas']['Conversation'];
export function ConversationContext({ conversation }: { conversation: Conversation }) {
  return <aside className="rounded-lg border border-border bg-surface p-4" aria-label="Ngữ cảnh nghiệp vụ email"><h3 className="font-bold text-text">Ngữ cảnh nghiệp vụ</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-text-muted">Ứng viên</dt><dd className="font-semibold text-text">{conversation.candidate.name}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">Mã ứng viên</dt><dd className="font-semibold text-text">{conversation.candidate.code}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">Đơn ứng tuyển</dt><dd className="font-semibold text-text">{conversation.applicationId ?? 'Chưa liên kết'}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-muted">Lộ trình</dt><dd className="font-semibold text-text">{conversation.journeyId ?? 'Chưa liên kết'}</dd></div></dl></aside>;
}
