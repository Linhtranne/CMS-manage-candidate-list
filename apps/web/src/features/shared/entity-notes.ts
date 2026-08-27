'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export type EntityNote = components['schemas']['EntityNote'];
export type NoteEntityType = 'CANDIDATE' | 'APPLICATION' | 'ORDER' | 'CLIENT' | 'JOURNEY';

export function useEntityNotes(entityType: NoteEntityType, entityId?: string) {
  return useQuery({
    queryKey: ['entity-notes', entityType, entityId],
    enabled: Boolean(entityId),
    queryFn: async () => {
      const response = await apiClient.GET('/notes', { params: { query: { entityType, entityId: entityId ?? '' } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
  });
}

export function useCreateEntityNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components['schemas']['CreateEntityNoteRequest']) => {
      const response = await apiClient.POST('/notes', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['entity-notes', variables.entityType, variables.entityId] }); },
  });
}
