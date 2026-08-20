'use client';

import { useState } from 'react';
import { SavedViewBar } from '@/components/ui/saved-view-bar';
import { SavedViewMenu } from '@/components/ui/saved-view-menu';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useListParams } from '@/hooks/use-list-params';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { useConversation, useConversations } from '../services/mail-queries';
import { ConversationList } from './conversation-list';
import { ConversationModal } from './conversation-modal';
import { useI18n } from '@/i18n/use-i18n';

const views = [['all', 'mailbox.views.all'], ['needs-action', 'mailbox.views.needsAction'], ['unmatched', 'mailbox.views.unmatched'], ['waiting-candidate', 'mailbox.views.waitingCandidate'], ['waiting-internal', 'mailbox.views.waitingInternal'], ['sent', 'mailbox.views.sent'], ['received', 'mailbox.views.received'], ['completed', 'mailbox.views.completed'], ['failed', 'mailbox.views.failed']] as const;

export function MailboxPage({ initialConversationId }: { initialConversationId?: string }) {
  const { t } = useI18n();
  const { params, setQuery, setView, setSelectedId } = useListParams({ defaultView: 'all' });
  const currentUser = useCurrentUser();
  const [localId, setLocalId] = useState(initialConversationId ?? params.selectedId);
  const [modalOpen, setModalOpen] = useState(Boolean(initialConversationId ?? params.selectedId));
  const selectedId = initialConversationId ?? localId;
  const listQuery = useConversations({ query: params.query, view: views.some(([id]) => id === params.view) ? params.view : 'all', journeyId: params.journeyId });
  const conversationQuery = useConversation(selectedId);
  const handleTabKeyDown = useTabKeyboard(views.map(([id]) => id), setView);
  const selectConversation = (id: string) => { setLocalId(id); setSelectedId(id); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const finishClose = () => { setLocalId(undefined); setSelectedId(undefined); };

  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">{t('mailbox.page.eyebrow')}</p><h1 className="mt-1 text-2xl font-bold text-text">{t('mailbox.page.title')}</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">{t('mailbox.page.description')}</p></div><SavedViewBar><label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-semibold text-text">{t('mailbox.page.search')}<input aria-label={t('mailbox.page.searchAria')} name="mail-search" value={params.query} onChange={(event) => setQuery(event.target.value)} placeholder={t('mailbox.page.searchPlaceholder')} className="min-h-10 min-w-0 flex-1 rounded-control border border-border bg-panel px-3 font-normal sm:w-80 sm:flex-none" /></label><span className="text-sm text-text-muted">{t('mailbox.page.defaultFrom')}</span>{currentUser.data ? <SavedViewMenu resource="mailbox" user={currentUser.data} query={{ view: params.view, query: params.query }} onApply={(saved) => { if (typeof saved.view === 'string') setView(saved.view); if (typeof saved.query === 'string') setQuery(saved.query); }} /> : null}</SavedViewBar><div className="flex flex-wrap gap-2" role="tablist" aria-label={t('mailbox.page.viewsLabel')} onKeyDown={handleTabKeyDown}>{views.map(([id, key]) => <button key={id} type="button" role="tab" data-tab-value={id} tabIndex={params.view === id ? 0 : -1} aria-selected={params.view === id} onClick={() => setView(id)} className={`min-h-10 rounded-control border px-3 text-sm font-semibold ${params.view === id ? 'border-accent bg-accent text-white' : 'border-border bg-panel text-text-muted hover:text-text'}`}>{t(key)}</button>)}</div><ConversationList conversations={listQuery.data?.items ?? []} isLoading={listQuery.isPending} error={listQuery.error ? t('mailbox.page.loadError') : undefined} onRetry={() => void listQuery.refetch()} onRowClick={(conversation) => selectConversation(conversation.id)} />{!selectedId ? <section className="rounded-lg border border-dashed border-border bg-panel p-8 text-center"><h2 className="font-semibold text-text">{t('mailbox.page.chooseConversation')}</h2><p className="mt-2 text-sm text-text-muted">{t('mailbox.page.modalHint')}</p></section> : null}<ConversationModal open={modalOpen} conversation={conversationQuery.data} isLoading={conversationQuery.isPending} error={conversationQuery.error ? t('mailbox.page.loadError') : undefined} onClose={closeModal} onRetry={() => void conversationQuery.refetch()} onRefetch={() => void conversationQuery.refetch()} onExited={finishClose} /></div>;
}
