'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';
import type { WorkListParams } from '../types';

export const workKeys = {
  list: (params: WorkListParams) => ['work-items', params] as const,
  summary: (view?: string) => ['work-summary', view] as const,
  detail: (id: string) => ['work-item', id] as const
};

export async function fetchWorkItems(params: WorkListParams = {}) {
  const response = await apiClient.GET('/work-items', { params: { query: params } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export async function fetchWorkSummary(view = 'actionable') {
  const response = await apiClient.GET('/work-items/summary', { params: { query: { view } } });
  if (response.error) throw new Error(response.error.message);
  return response.data.summary;
}

export async function fetchWorkItem(id: string) {
  const response = await apiClient.GET('/work-items/{id}', { params: { path: { id } } });
  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useWorkItems(params: WorkListParams = {}) {
  return useQuery({ queryKey: workKeys.list(params), queryFn: () => fetchWorkItems(params) });
}

export function useWorkSummary(view = 'actionable') {
  return useQuery({ queryKey: workKeys.summary(view), queryFn: () => fetchWorkSummary(view) });
}

export function useWorkItem(id?: string) {
  return useQuery({ queryKey: workKeys.detail(id ?? ''), queryFn: () => fetchWorkItem(id ?? ''), enabled: Boolean(id) });
}

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: components['schemas']['WorkItemUpdate'] }) => {
      const response = await apiClient.PATCH('/work-items/{id}', { params: { path: { id } }, body });
      if (response.error) {
        const error = new Error(response.error.message);
        Object.assign(error, { status: response.response.status, code: response.error.code });
        throw error;
      }
      return response.data;
    },
    onSuccess: (item) => {
      queryClient.setQueryData(workKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: ['work-items'] });
      void queryClient.invalidateQueries({ queryKey: ['work-summary'] });
    }
  });
}

