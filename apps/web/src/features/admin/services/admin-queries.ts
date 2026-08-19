'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';

type AdminUserUpdate = components['schemas']['AdminUserUpdate'];
type CreateAdminUserRequest = components['schemas']['CreateAdminUserRequest'];
type AdminRoleUpdate = components['schemas']['AdminRoleUpdate'];
type VersionedActionRequest = components['schemas']['VersionedActionRequest'];

const useAdminQuery = <T,>(queryFn: () => Promise<T>, queryKey: readonly unknown[]) => useQuery({ queryKey, queryFn });

export function useAdminUsers(query = '') {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/users', { params: { query: { query } } }); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-users', query]);
}

export function useAdminRoles() {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/roles'); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-roles']);
}

export function useAdminCatalogs(type?: string) {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/catalogs', { params: { query: { type } } }); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-catalogs', type]);
}

export function useAdminTemplates(type?: 'JOURNEY' | 'EMAIL') {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/templates', { params: { query: { type } } }); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-templates', type]);
}

export function useAdminMailbox() {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/mailbox'); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-mailbox']);
}

export function useUpdateAdminMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components['schemas']['MailboxSettingsUpdate']) => {
      const response = await apiClient.PATCH('/admin/mailbox', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => { queryClient.setQueryData(['admin-mailbox'], data); void queryClient.invalidateQueries({ queryKey: ['admin-audit'] }); }
  });
}

export function useAdminAudit(filters: { actorId?: string; resourceId?: string; action?: string; from?: string; to?: string } = {}) {
  return useAdminQuery(async () => { const response = await apiClient.GET('/admin/audit', { params: { query: filters } }); if (response.error) throw new Error(response.error.message); return response.data; }, ['admin-audit', filters]);
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, body }: { id: string; body: AdminUserUpdate }) => { const response = await apiClient.PATCH('/admin/users/{id}', { params: { path: { id } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-users'] }); } });
}

export function useInviteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAdminUserRequest) => {
      const response = await apiClient.POST('/admin/users', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-users'] }); }
  });
}

export function useUpdateAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, body }: { id: string; body: AdminRoleUpdate }) => { const response = await apiClient.PATCH('/admin/roles/{id}', { params: { path: { id } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-roles'] }); } });
}

export function useRetireAdminCatalog() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, body }: { id: string; body: VersionedActionRequest }) => { const response = await apiClient.POST('/admin/catalogs/{id}/retire', { params: { path: { id } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-catalogs'] }); } });
}

export function useCreateAdminCatalog() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (body: components['schemas']['CreateAdminCatalogRequest']) => { const response = await apiClient.POST('/admin/catalogs', { body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-catalogs'] }); } });
}

export function useRetireAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ id, body }: { id: string; body: VersionedActionRequest }) => { const response = await apiClient.POST('/admin/templates/{id}/retire', { params: { path: { id } }, body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-templates'] }); } });
}

export function useCreateAdminTemplate() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (body: components['schemas']['CreateAdminTemplateRequest']) => { const response = await apiClient.POST('/admin/templates', { body }); if (response.error) throw new Error(response.error.message); return response.data; }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['admin-templates'] }); } });
}
