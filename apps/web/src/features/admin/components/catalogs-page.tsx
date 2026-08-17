'use client';

import { useAdminCatalogs, useRetireAdminCatalog } from '../services/admin-queries';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';

export function CatalogsPage() {
  const query = useAdminCatalogs();
  const retire = useRetireAdminCatalog();
  if (query.isPending) return <LoadingState label="Đang tải danh mục" />;
  if (query.error) return <ErrorState message="Không thể tải danh mục." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Danh mục có version</p><h1 className="mt-1 text-2xl font-bold text-text">Danh mục ngành, nghề và nguồn</h1><p className="mt-2 text-sm text-text-muted">Giá trị đã từng được sử dụng chỉ được ngừng sử dụng, không xóa khỏi lịch sử.</p></div><section className="overflow-x-auto rounded-lg border border-border bg-panel p-5"><table className="w-full min-w-[44rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Mã</th><th className="px-3 py-3">Nhãn</th><th className="px-3 py-3">Đang dùng</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Thao tác</th></tr></thead><tbody>{query.data?.items.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="px-3 py-3 text-text-muted">{item.type}</td><td className="px-3 py-3 font-semibold text-text">{item.code}</td><td className="px-3 py-3 text-text">{item.label}</td><td className="px-3 py-3 text-text-muted">{item.usageCount}</td><td className="px-3 py-3"><StatusLabel tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status === 'ACTIVE' ? 'Đang dùng' : 'Đã ngừng'}</StatusLabel></td><td className="px-3 py-3">{item.status === 'ACTIVE' ? <button type="button" className="text-sm font-semibold text-danger underline" aria-label={item.type === 'INDUSTRY' ? 'Ngừng sử dụng ngành nghề' : `Ngừng sử dụng ${item.label}`} disabled={retire.isPending} onClick={() => void retire.mutateAsync({ id: item.id, body: { version: item.version } })}>Ngừng sử dụng</button> : <span className="text-sm text-text-muted">Không thao tác</span>}</td></tr>)}</tbody></table></section></div>;
}
