import type { components } from '@cms/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type Notification = components['schemas']['Notification'];
export type NotificationsResponse = components['schemas']['NotificationsResponse'];

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.GET('/notifications', { params: { query: { limit: 20 } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.POST('/notifications/{id}/read', { params: { path: { id } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST('/notifications/read-all');
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
  });
}
