'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useLinkConversation } from '../services/mail-queries';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';

type Conversation = components['schemas']['ConversationDetail'];
const candidateOptions = [{ value: 'candidate-01', code: 'UV-0001', key: 'adminExtraNames.candidate01' }, { value: 'candidate-07', code: 'UV-0007', key: 'adminExtraNames.candidate07' }] as const;
export function LinkConversationDialog({ conversation, open, onClose, onSaved }: { conversation: Conversation; open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { t } = useI18n();
  const mutation = useLinkConversation();
  const [candidateId, setCandidateId] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (!candidateId) { setError(t('mailbox.link.choose')); return; }
    try { await mutation.mutateAsync({ conversationId: conversation.id, body: { candidateId, applicationId: candidateId === 'candidate-01' ? 'application-waiting-01' : null, journeyId: null, version: conversation.version } }); onSaved?.(); onClose(); } catch (cause) { setError(localizedError(t, cause, t('mailbox.page.loadError'))); }
  };
  return <Modal open={open} onClose={onClose} title={t('mailbox.link.title')} description={conversation.subject} size="md" footer={<><Button onClick={onClose}>{t('mailbox.link.cancel')}</Button><Button variant="primary" disabled={!candidateId || mutation.isPending} onClick={() => void submit()}>{t('mailbox.link.confirm')}</Button></>}>
    <div className="space-y-4">
      <p className="text-sm text-text-muted">{t('mailbox.link.description')}</p>
      <label className="block text-sm font-semibold text-text">{t('mailbox.link.candidate')}<select aria-label={t('mailbox.link.candidateAria')} name="mail-candidate-link" value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('mailbox.link.choose')}</option>{candidateOptions.map((option) => <option key={option.value} value={option.value}>{option.code} · {t(option.key as Parameters<typeof t>[0])}</option>)}</select></label>
      {error ? <p role="alert" className="text-sm font-semibold text-danger">{error}</p> : null}
    </div>
  </Modal>;
}
