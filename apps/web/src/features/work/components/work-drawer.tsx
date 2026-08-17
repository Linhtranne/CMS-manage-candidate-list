'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useUpdateWorkItem, useWorkItem } from '../services/work-queries';
import { WorkActions } from './work-actions';

export function WorkDrawer({ workItemId, open, onClose }: { workItemId?: string; open: boolean; onClose: () => void }) {
  const query = useWorkItem(workItemId);
  const mutation = useUpdateWorkItem();
  const [success, setSuccess] = useState(false);
  const item = query.data;

  return (
    <DetailDrawer open={open} title="Chi tiết công việc" onClose={onClose}>
      {query.isPending ? <LoadingState /> : query.error || !item ? <ErrorState message="Không thể tải chi tiết công việc." onRetry={() => void query.refetch()} /> : (
        <div className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Nguồn / quy tắc tạo việc</p><p className="mt-2 font-semibold text-text">{item.sourceLabel}</p><p className="mt-1 text-sm text-text-muted">Mã nguồn: {item.sourceType}</p></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-muted">Ứng viên</dt><dd className="mt-1 font-semibold">{item.candidate.code} · {item.candidate.name}</dd></div><div><dt className="text-text-muted">Đơn tuyển</dt><dd className="mt-1 font-semibold">{item.order.code} · {item.order.position}</dd></div><div><dt className="text-text-muted">Hạn xử lý</dt><dd className="mt-1 font-semibold">{new Date(item.dueAt).toLocaleString('vi-VN')}</dd></div><div><dt className="text-text-muted">Phụ trách</dt><dd className="mt-1 font-semibold">{item.assignee.name}</dd></div></dl>
          <div className="rounded-lg border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Hoạt động gần nhất</p><p className="mt-2 text-sm text-text">{item.lastActivity ?? 'Chưa có hoạt động'}</p>{item.notes ? <p className="mt-2 text-sm text-text-muted">{item.notes}</p> : null}</div>
          {mutation.error && (mutation.error as Error & { code?: string }).code === 'VERSION_CONFLICT' ? <div role="alert" className="space-y-2 rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-4"><p className="text-sm font-semibold text-danger">Dữ liệu vừa được cập nhật</p><Button variant="secondary" size="sm" onClick={() => void query.refetch()}>Tải lại</Button></div> : null}
          {success ? <p role="status" className="rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">Đã hoàn thành công việc</p> : null}
          <div className="flex items-center gap-2"><StatusLabel tone={item.status === 'DONE' ? 'success' : 'info'}>{item.status === 'DONE' ? 'Đã hoàn thành' : 'Đang chờ xử lý'}</StatusLabel><span className="text-xs text-text-muted">Phiên bản {item.version}</span></div>
          <WorkActions disabled={mutation.isPending || item.status === 'DONE'} onComplete={() => mutation.mutate({ id: item.id, body: { status: 'DONE', version: item.version } }, { onSuccess: () => setSuccess(true) })} />
        </div>
      )}
    </DetailDrawer>
  );
}

