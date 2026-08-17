'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['session', 'current-user'],
    queryFn: async () => {
      const response = await apiClient.GET('/me');
      if (response.error) {
        const error = new Error(response.error.message);
        Object.assign(error, { status: response.response.status, code: response.error.code });
        throw error;
      }
      return response.data;
    },
    staleTime: 30_000,
    retry: false
  });
}
