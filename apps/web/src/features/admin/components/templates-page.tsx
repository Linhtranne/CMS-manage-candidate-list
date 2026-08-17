'use client';

import { useAdminTemplates, useRetireAdminTemplate } from '../services/admin-queries';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';

export function TemplatesPage() {
  const query = useAdminTemplates();
  const retire = useRetireAdminTemplate();
  if (query.isPending) return <LoadingState label="Đang tải template" />;
  if (query.error) return <ErrorState message="Không thể tải template." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Template có version</p><h1 className="mt-1 text-2xl font-bold text-text">Template hành trình và email</h1><p className="mt-2 text-sm text-text-muted">Mỗi phiên bản được giữ nguyên để audit và tái hiện nội dung đã dùng.</p></div><div className="grid gap-4 lg:grid-cols-2">{query.data?.items.map((item) => <article key={item.id} className="rounded-lg border border-border bg-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{item.type} · {item.version}</p><h2 className="mt-1 font-bold text-text">{item.name}</h2></div><StatusLabel tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status === 'ACTIVE' ? 'Đang dùng' : item.status === 'RETIRED' ? 'Đã ngừng' : 'Bản nháp'}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">{item.previewText}</p><div className="mt-4 flex items-center justify-between text-xs text-text-muted"><span>Đang được dùng ở {item.usedByCount} bản ghi</span>{item.status === 'ACTIVE' ? <button type="button" className="font-semibold text-danger underline" onClick={() => void retire.mutateAsync({ id: item.id, body: { version: Number(item.version.replace('v', '')) } })}>Ngừng sử dụng</button> : null}</div></article>)}</div></div>;
}
