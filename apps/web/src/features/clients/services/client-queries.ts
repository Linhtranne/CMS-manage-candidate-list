'use client';

import { useQuery } from '@tanstack/react-query';
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

