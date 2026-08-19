'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useLinkConversation } from '../services/mail-queries';

type Conversation = components['schemas']['ConversationDetail'];
export function LinkConversationDialog({ conversation, open, onClose, onSaved }: { conversation: Conversation; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const mutation = useLinkConversation();
  const [candidateId, setCandidateId] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (!candidateId) { setError('Cần chọn ứng viên để liên kết.'); return; }
    try { await mutation.mutateAsync({ conversationId: conversation.id, body: { candidateId, applicationId: candidateId === 'candidate-01' ? 'application-waiting-01' : null, journeyId: null, version: conversation.version } }); onSaved?.(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể liên kết chuỗi email'); }
  };
  return <Modal open={open} onClose={onClose} title="Liên kết ứng viên" description={conversation.subject} size="md" footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" disabled={!candidateId || mutation.isPending} onClick={() => void submit()}>Xác nhận liên kết</Button></>}>
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Email chưa được ghép tự động. Chọn ứng viên thủ công để ghi audit.</p>
      <label className="block text-sm font-semibold text-text">Ứng viên<select aria-label="Ứng viên liên kết" name="ung-vien-lien-ket" value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Chọn ứng viên</option><option value="candidate-01">UV-0001 · Nguyễn Minh An</option><option value="candidate-07">UV-0007 · Lê Hoàng Yến</option></select></label>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  </Modal>;
}
