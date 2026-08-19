'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

type ApplicationListParams = { query?: string; view?: 'screening' | 'waiting-interview' | 'interviewed' | 'waiting-result' | 'passed' | 'failed' | 'withdrawn' | 'closed' | 'overdue'; orderId?: string; ownerId?: string; cursor?: string };

export async function fetchApplications(params: ApplicationListParams = {}) {
  const response = await apiClient.GET('/applications', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function fetchApplication(id: string) {
  const response = await apiClient.GET('/applications/{id}', { params: { path: { id } } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useApplications(params: ApplicationListParams = {}) {
  return useQuery({ queryKey: ['applications', params], queryFn: () => fetchApplications(params) });
}

export function useApplication(id?: string) {
  return useQuery({ queryKey: ['application', id], queryFn: () => fetchApplication(id ?? ''), enabled: Boolean(id) });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, body }: { applicationId: string; body: components['schemas']['CreateInterviewRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/interviews', { params: { path: { id: applicationId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); }
  });
}

export function useRescheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, interviewId, body }: { applicationId: string; interviewId: string; body: components['schemas']['RescheduleInterviewRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/interviews/{interviewId}/reschedules', { params: { path: { id: applicationId, interviewId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); }
  });
}

export function useCancelInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, interviewId, body }: { applicationId: string; interviewId: string; body: components['schemas']['CancelInterviewRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/interviews/{interviewId}/cancellation', { params: { path: { id: applicationId, interviewId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); }
  });
}

export function useMarkInterviewNoShow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, interviewId, body }: { applicationId: string; interviewId: string; body: components['schemas']['CancelInterviewRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/interviews/{interviewId}/no-show', { params: { path: { id: applicationId, interviewId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); }
  });
}

export function useSaveInterviewResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, interviewId, body }: { applicationId: string; interviewId: string; body: components['schemas']['SaveInterviewResultRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/interviews/{interviewId}/results', { params: { path: { id: applicationId, interviewId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); }
  });
}

export function useDecideApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, body }: { applicationId: string; body: components['schemas']['ApplicationDecisionRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/decisions', { params: { path: { id: applicationId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['applications'] }); void queryClient.invalidateQueries({ queryKey: ['journey-eligibility', variables.applicationId] }); }
  });
}

export function useJourneyEligibility(applicationId?: string) {
  return useQuery({ queryKey: ['journey-eligibility', applicationId], queryFn: async () => { const response = await apiClient.GET('/applications/{id}/journey-eligibility', { params: { path: { id: applicationId ?? '' } } }); if (response.error) throw new Error(response.error.message); return response.data; }, enabled: Boolean(applicationId) });
}

export function useStartSupplyJourney() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, body }: { applicationId: string; body: components['schemas']['StartSupplyJourneyRequest'] }) => {
      const response = await apiClient.POST('/applications/{id}/supply-journey', { params: { path: { id: applicationId } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] }); void queryClient.invalidateQueries({ queryKey: ['journey-eligibility', variables.applicationId] }); }
  });
}
