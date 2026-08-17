'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export async function fetchOrders(params: { query?: string; status?: string; industry?: string } = {}) {
  const response = await apiClient.GET('/orders', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function fetchOrder(id: string) {
  const response = await apiClient.GET('/orders/{id}', { params: { path: { id } } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function searchCandidatesForOrder(params: { orderId: string; query?: string; industry?: string }) {
  const response = await apiClient.GET('/candidates/search-for-order', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useClientsForOrder(params: { query?: string; industry?: string; orderId?: string } = {}) {
  return useQuery({ queryKey: ['candidates-for-order', params], queryFn: () => searchCandidatesForOrder({ orderId: params.orderId ?? '', query: params.query, industry: params.industry }), enabled: Boolean(params.orderId) });
}

export function useOrders(params: { query?: string; status?: string; industry?: string } = {}) {
  return useQuery({ queryKey: ['orders', params], queryFn: () => fetchOrders(params) });
}

export function useOrder(id?: string) {
  return useQuery({ queryKey: ['order', id], queryFn: () => fetchOrder(id ?? ''), enabled: Boolean(id) });
}

export function useAddCandidatesToOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, body }: { orderId: string; body: components['schemas']['AddCandidatesRequest'] }) => {
      const response = await apiClient.POST('/orders/{id}/applications', { params: { path: { id: orderId } }, body });
      if (response.error) {
        const error = new Error(response.error.message);
        Object.assign(error, { status: response.response.status, code: response.error.code });
        throw error;
      }
      return response.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['candidates-for-order'] });
    }
  });
}

