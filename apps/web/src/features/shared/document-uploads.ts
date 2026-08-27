'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBaseUrl, apiClient } from '@/lib/api/client';

async function sha256(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

export function useUploadCandidateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateId, file, category = 'OTHER', journeyId, milestoneId }: { candidateId: string; file: File; category?: string; journeyId?: string; milestoneId?: string }) => {
      const checksum = await sha256(file);
      const response = await apiClient.POST('/documents/uploads', { body: { candidateId, title: file.name, category, claimedMime: file.type || 'application/octet-stream', sizeBytes: file.size, checksum } });
      if (response.error) throw new Error(response.error.message);
      const upload = response.data as unknown as { documentId: string; uploadUrl: string };
      const uploadUrl = new URL(upload.uploadUrl, `${apiBaseUrl}/`).href;
      const put = await globalThis.fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream', 'x-amz-checksum-sha256': checksum }, body: file });
      if (!put.ok) throw new Error('DOCUMENT_UPLOAD_FAILED');
      const verification = await apiClient.POST('/documents/{id}/verification', { params: { path: { id: upload.documentId } }, body: {} as never });
      if (verification.error) throw new Error(verification.error.message);
      const linked = await apiClient.POST('/documents/{id}/links', { params: { path: { id: upload.documentId } }, body: { candidateId, ...(journeyId ? { journeyId } : {}), ...(milestoneId ? { milestoneId } : {}) } });
      if (linked.error) throw new Error(linked.error.message);
      return verification.data;
    },
    onSuccess: (_data, variables) => { void queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] }); if (variables.journeyId) void queryClient.invalidateQueries({ queryKey: ['supply-journey', variables.journeyId] }); },
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiClient.POST('/documents/{id}/downloads', { params: { path: { id: documentId } }, body: {} as never });
      if (response.error) throw new Error(response.error.message);
      const value = response.data as unknown as { url?: unknown };
      if (typeof value.url !== 'string' || !value.url) throw new Error('DOCUMENT_DOWNLOAD_URL_MISSING');
      const url = new URL(value.url, `${apiBaseUrl}/`).href;
      if (typeof window !== 'undefined') window.location.assign(url);
      return url;
    },
  });
}
