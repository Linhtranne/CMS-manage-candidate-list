'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export type CandidateView = 'all' | 'potential' | 'new-unassigned' | 'ready-to-match' | 'applying' | 'passed' | 'supplying' | 'supplied' | 'paused' | 'archived' | 'missing-contact' | 'missing-documents' | 'duplicates';

export type CandidateListParams = {
  query?: string;
  view?: CandidateView;
  industry?: string;
  readiness?: string;
  contactability?: string;
  occupation?: string;
  skill?: string;
  desiredLocation?: string;
  source?: string;
  recordStatus?: string;
  experience?: string;
  cursor?: string;
};

export async function fetchCandidates(params: CandidateListParams = {}) {
  const response = await apiClient.GET('/candidates', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function fetchCandidate(id: string) {
  const response = await apiClient.GET('/candidates/{id}', { params: { path: { id } } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useCandidates(params: CandidateListParams = {}) {
  return useQuery({ queryKey: ['candidates', params], queryFn: () => fetchCandidates(params) });
}

export function useCandidate(id?: string) {
  return useQuery({ queryKey: ['candidate', id], queryFn: () => fetchCandidate(id ?? ''), enabled: Boolean(id) });
}

export type Candidate = components['schemas']['Candidate'];
export type CandidateDetail = components['schemas']['CandidateDetail'];
export type CreateCandidateRequest = components['schemas']['CreateCandidateRequest'];
export type CandidateUpdateRequest = components['schemas']['CandidateUpdateRequest'];
export type ImportCandidatesRequest = components['schemas']['ImportCandidatesRequest'];
export type DuplicateReviewRequest = components['schemas']['DuplicateReviewRequest'];

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCandidateRequest) => {
      const response = await apiClient.POST('/candidates', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['candidates'] }); }
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: CandidateUpdateRequest }) => {
      const response = await apiClient.PATCH('/candidates/{id}', { params: { path: { id } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });
}

export function useImportCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ImportCandidatesRequest) => {
      const response = await apiClient.POST('/candidates/imports', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['candidates'] }); }
  });
}

export function useReviewCandidateDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: DuplicateReviewRequest }) => {
      const response = await apiClient.POST('/candidates/{id}/duplicate-review', { params: { path: { id } }, body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    }
  });
}
