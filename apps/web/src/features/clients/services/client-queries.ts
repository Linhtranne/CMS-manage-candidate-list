'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export async function fetchClients(params: { query?: string; status?: string } = {}) {
  const response = await apiClient.GET('/clients', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function fetchClient(id: string) {
  const response = await apiClient.GET('/clients/{id}', { params: { path: { id } } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useClients(params: { query?: string; status?: string } = {}) {
  return useQuery({ queryKey: ['clients', params], queryFn: () => fetchClients(params) });
}

export function useClient(id?: string) {
  return useQuery({ queryKey: ['client', id], queryFn: () => fetchClient(id ?? ''), enabled: Boolean(id) });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components['schemas']['CreateClientRequest']) => {
      const response = await apiClient.POST('/clients', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['clients'] }); }
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: components['schemas']['ClientUpdateRequest'] }) => {
      const response = await apiClient.PATCH('/clients/{id}', { params: { path: { id } }, body });
      if (response.error) {
        const error = new Error(response.error.message);
        Object.assign(error, { status: response.response.status, code: response.error.code });
        throw error;
      }
      return response.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });
}

