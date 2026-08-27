'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: components['schemas']['UpdateCurrentUserRequest']) => {
      const response = await apiClient.PATCH('/me', { body });
      if (response.error) {
        const error = new Error(response.error.message);
        Object.assign(error, { code: response.error.code });
        throw error;
      }
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['session', 'current-user'], user);
    }
  });
}
