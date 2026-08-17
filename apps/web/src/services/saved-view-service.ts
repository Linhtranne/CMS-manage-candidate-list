import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

export type SaveViewInput = {
  resource: string;
  name: string;
  query: Record<string, string | string[]>;
  visibility: 'PRIVATE' | 'TEAM';
};

export async function saveView(input: SaveViewInput) {
  const response = await apiClient.POST('/saved-views', { body: input as never });
  if (response.error) throw new Error(response.error.message);
  return response.data as components['schemas']['SavedView'];
}
