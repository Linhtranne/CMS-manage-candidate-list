'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

type UpdateMilestoneRequest = components['schemas']['UpdateMilestoneRequest'];
type WaiveMilestoneRequest = components['schemas']['WaiveMilestoneRequest'];
type JourneyView = 'all' | 'active' | 'on-hold' | 'at-risk' | 'overdue' | 'waiting-candidate' | 'waiting-external' | 'near-complete' | 'completed' | 'cancelled';

export function useJourneys({ query = '', view = 'all', ownerId }: { query?: string; view?: string; ownerId?: string }) {
  const normalizedView = view as JourneyView;
  return useQuery({
    queryKey: ['supply-journeys', query, normalizedView, ownerId],
    queryFn: async () => {
      const response = await apiClient.GET('/supply-journeys', { params: { query: { query, view: normalizedView, ownerId } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    }
  });
}

export function useJourney(journeyId?: string) {
  return useQuery({
    queryKey: ['supply-journey', journeyId],
    queryFn: async () => {
      const response = await apiClient.GET('/supply-journeys/{id}', { params: { path: { id: journeyId ?? '' } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: Boolean(journeyId)
  });
}

export function useUpdateMilestone(journeyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, body }: { milestoneId: string; body: UpdateMilestoneRequest }) => {
      const response = await apiClient.PATCH('/supply-journeys/{id}/milestones/{milestoneId}', { params: { path: { id: journeyId, milestoneId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['supply-journey', journeyId] }); void queryClient.invalidateQueries({ queryKey: ['supply-journeys'] }); }
  });
}

export function useWaiveMilestone(journeyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, body }: { milestoneId: string; body: WaiveMilestoneRequest }) => {
      const response = await apiClient.POST('/supply-journeys/{id}/milestones/{milestoneId}/waiver', { params: { path: { id: journeyId, milestoneId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['supply-journey', journeyId] }); void queryClient.invalidateQueries({ queryKey: ['supply-journeys'] }); }
  });
}
