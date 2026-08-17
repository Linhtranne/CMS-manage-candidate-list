'use client';

import { useState } from 'react';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { useListParams } from '@/hooks/use-list-params';
import { useConversation, useConversations } from '../services/mail-queries';
import { ConversationList } from './conversation-list';
import { ConversationModal } from './conversation-modal';

const views = [['all', 'Tất cả'], ['needs-action', 'Cần xử lý'], ['unmatched', 'Chưa ghép'], ['sent', 'Đã gửi'], ['received', 'Đã nhận']] as const;
export function MailboxPage({ initialConversationId }: { initialConversationId?: string }) {
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'all' });
  const [localId, setLocalId] = useState(initialConversationId ?? params.selectedId);
  const [modalOpen, setModalOpen] = useState(Boolean(initialConversationId ?? params.selectedId));
  const selectedId = initialConversationId ?? localId;
  const listQuery = useConversations({ query: params.query, view: views.some(([id]) => id === params.view) ? params.view : 'all' });
  const conversationQuery = useConversation(selectedId);
  const selectConversation = (id: string) => { setLocalId(id); setSelectedId(id); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const finishClose = () => { setLocalId(undefined); setSelectedId(undefined); };
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Một hộp thư chính danh</p><h1 className="mt-1 text-2xl font-bold text-text">Hộp thư chung</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Lưu lịch sử gửi/nhận, phản hồi và tệp đính kèm của ứng viên. Email không tự thay đổi trạng thái nghiệp vụ.</p></div><SavedViewBar><label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">Tìm email<input aria-label="Tìm email" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder="Chủ đề, địa chỉ, ứng viên" className="min-h-10 w-80 rounded-control border border-border bg-panel px-3 font-normal" /></label><span className="text-sm text-text-muted">From mặc định: ungvien@company.vn</span></SavedViewBar><div className="flex flex-wrap gap-2" role="tablist" aria-label="Các view hộp thư">{views.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={params.view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${params.view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{label}</button>)}</div><ConversationList conversations={listQuery.data?.items ?? []} isLoading={listQuery.isPending} error={listQuery.error ? 'Không thể tải hộp thư chung.' : undefined} onRetry={() => void listQuery.refetch()} onRowClick={(conversation) => selectConversation(conversation.id)} />{!selectedId ? <section className="rounded-lg border border-dashed border-border bg-panel p-8 text-center"><h2 className="font-semibold text-text">Chọn một chuỗi email để xem</h2><p className="mt-2 text-sm text-text-muted">Chi tiết sẽ mở trong một lớp modal để bạn không mất ngữ cảnh danh sách.</p></section> : null}<ConversationModal open={modalOpen} conversation={conversationQuery.data} isLoading={conversationQuery.isPending} error={conversationQuery.error ? 'Không thể tải chuỗi email.' : undefined} onClose={closeModal} onRetry={() => void conversationQuery.refetch()} onRefetch={() => void conversationQuery.refetch()} onExited={finishClose} /></div>;
}
