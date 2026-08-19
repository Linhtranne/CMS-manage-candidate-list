'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

type SendEmailRequest = components['schemas']['SendEmailRequest'];
type LinkConversationRequest = components['schemas']['LinkConversationRequest'];
type MailView = 'all' | 'needs-action' | 'unmatched' | 'sent' | 'received' | 'waiting-candidate' | 'waiting-internal' | 'completed' | 'failed';

export function useConversations({ query = '', view = 'all', journeyId }: { query?: string; view?: string; journeyId?: string }) {
  const normalizedView = view as MailView;
  return useQuery({ queryKey: ['mailbox-conversations', query, normalizedView, journeyId], queryFn: async () => { const response = await apiClient.GET('/mailbox/conversations', { params: { query: { query, view: normalizedView, journeyId } } }); if (response.error) throw new Error(response.error.message); return response.data; } });
}

export function useConversation(conversationId?: string) {
  return useQuery({ queryKey: ['mailbox-conversation', conversationId], queryFn: async () => { const response = await apiClient.GET('/mailbox/conversations/{id}', { params: { path: { id: conversationId ?? '' } } }); if (response.error) throw new Error(response.error.message); return response.data; }, enabled: Boolean(conversationId) });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ conversationId, body }: { conversationId: string; body: SendEmailRequest }) => { const response = await apiClient.POST('/mailbox/conversations/{id}/send', { params: { path: { id: conversationId } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['mailbox-conversation', variables.conversationId] }); void queryClient.invalidateQueries({ queryKey: ['mailbox-conversations'] }); } });
}

export function useLinkConversation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ conversationId, body }: { conversationId: string; body: LinkConversationRequest }) => { const response = await apiClient.POST('/mailbox/conversations/{id}/link', { params: { path: { id: conversationId } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['mailbox-conversation', variables.conversationId] }); void queryClient.invalidateQueries({ queryKey: ['mailbox-conversations'] }); } });
}
