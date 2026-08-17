'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@cms/contracts';
import { apiClient } from '@/lib/api/client';
import type { ReportFilters } from '../domain/report-filters';

type CreateReportExportRequest = components['schemas']['CreateReportExportRequest'];

export function useReportSummary(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-summary', filters],
    queryFn: async () => {
      const response = await apiClient.GET('/reports/summary', { params: { query: filters } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    }
  });
}

export function useReportFunnel(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-funnel', filters],
    queryFn: async () => {
      const response = await apiClient.GET('/reports/funnel', { params: { query: filters } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    }
  });
}

export function useCreateReportExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateReportExportRequest) => {
      const response = await apiClient.POST('/reports/exports', { body });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['report-exports'] }); }
  });
}

export function useReportExportJob(jobId?: string) {
  return useQuery({
    queryKey: ['report-exports', jobId],
    queryFn: async () => {
      const response = await apiClient.GET('/reports/exports/{id}', { params: { path: { id: jobId ?? '' } } });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => query.state.data?.status === 'QUEUED' || query.state.data?.status === 'RUNNING' ? 2_000 : false
  });
}
