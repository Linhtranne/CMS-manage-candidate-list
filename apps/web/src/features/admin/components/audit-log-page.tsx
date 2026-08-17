'use client';

import { useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useAdminAudit } from '../services/admin-queries';

export function AuditLogPage() {
  const [resourceId, setResourceId] = useState('');
  const [action, setAction] = useState('');
  const query = useAdminAudit({ resourceId: resourceId || undefined, action: action || undefined });
  if (query.isPending) return <LoadingState label="Đang tải audit log" />;
  if (query.error) return <ErrorState message="Không thể tải audit log." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Truy vết bất biến</p><h1 className="mt-1 text-2xl font-bold text-text">Audit log</h1><p className="mt-2 text-sm text-text-muted">Server lọc theo quyền; nội dung nhạy cảm được mask và không có thao tác sửa/xóa.</p></div><section className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-panel p-4"><label className="text-sm font-semibold text-text">Resource ID<input aria-label="Resource ID" value={resourceId} onChange={(event) => setResourceId(event.target.value)} className="mt-1 min-h-10 rounded-control border border-border bg-panel px-3 font-normal" placeholder="candidate-01" /></label><label className="text-sm font-semibold text-text">Action<input aria-label="Audit action" value={action} onChange={(event) => setAction(event.target.value)} className="mt-1 min-h-10 rounded-control border border-border bg-panel px-3 font-normal" placeholder="EMAIL_SENT" /></label></section><section className="overflow-x-auto rounded-lg border border-border bg-panel p-5"><table className="w-full min-w-[58rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3">Thời gian</th><th className="px-3 py-3">Actor</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Resource</th><th className="px-3 py-3">Nguồn</th><th className="px-3 py-3">Tóm tắt</th></tr></thead><tbody>{query.data?.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-3 py-3 text-text-muted">{new Date(item.occurredAt).toLocaleString('vi-VN')}</td><td className="px-3 py-3 text-text">{item.actor.name}</td><td className="px-3 py-3 font-semibold text-text">{item.action}</td><td className="px-3 py-3 text-text-muted">{item.resourceType} · {item.resourceId}</td><td className="px-3 py-3 text-text-muted">{item.source}</td><td className="px-3 py-3 text-text">{item.summary}</td></tr>)}</tbody></table></section></div>;
}
