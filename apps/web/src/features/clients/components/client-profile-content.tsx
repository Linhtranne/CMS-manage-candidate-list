'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import type { Client } from '../services/client-types';
import { useApplications } from '@/features/applications/services/application-queries';
import { useOrders } from '@/features/orders/services/order-queries';
import { StatusLabel } from '@/components/ui/status-label';
import { Button } from '@/components/ui/button';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';

export const clientTabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'orders', label: 'Đơn tuyển' },
  { id: 'candidates', label: 'Ứng viên cung ứng' },
  { id: 'contacts', label: 'Liên hệ' },
  { id: 'files', label: 'Tệp & ghi chú' },
  { id: 'history', label: 'Lịch sử thay đổi' }
] as const;

export type ClientTab = (typeof clientTabs)[number]['id'];

function statusLabel(status: Client['status']) {
  if (status === 'ACTIVE') return 'Đang hợp tác';
  if (status === 'PROSPECT') return 'Tiềm năng';
  if (status === 'PAUSED') return 'Tạm dừng';
  return 'Ngừng hợp tác';
}

function KpiCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <section className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">{label}</p><p className="mt-2 text-2xl font-bold text-text">{value}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></section>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm text-text-muted">{label}</dt><dd className="mt-1 font-semibold text-text">{value}</dd></div>;
}

function OverviewTab({ client }: { client: Client }) {
  return <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Thông tin tổ chức</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Mã khách hàng" value={client.code} /><InfoRow label="Loại tổ chức" value={client.organizationType} /><InfoRow label="Ngành nghề" value={client.industryLabels.join(', ')} /><InfoRow label="Khu vực" value={client.region} /><InfoRow label="Phụ trách nội bộ" value={client.owner.name} /><InfoRow label="Liên hệ chính" value={client.contactName ?? 'Chưa cập nhật'} /></dl></section><section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Tình hình cung ứng</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Đơn đang tuyển" value={`${client.activeOrders} đơn`} /><InfoRow label="Chỉ tiêu đang tuyển" value={`${client.target} người`} /><InfoRow label="Đã trúng tuyển" value={`${client.passed} người`} /><InfoRow label="Hoạt động cuối" value={new Date(client.lastActivity).toLocaleDateString('vi-VN')} /></dl><div className="mt-5 rounded-control border border-border bg-surface p-4"><p className="text-sm font-semibold text-text">Việc cần theo dõi</p><p className="mt-1 text-sm text-text-muted">{client.activeOrders > 0 ? `Tiếp tục theo dõi ${client.activeOrders} đơn đang tuyển của khách hàng.` : 'Chưa có đơn tuyển đang hoạt động.'}</p></div></section><section className="rounded-lg border border-border bg-panel p-5 lg:col-span-2"><h2 className="text-base font-bold text-text">Ghi chú vận hành</h2>{client.notes ? <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">{client.notes}</p> : <p className="mt-3 text-sm text-text-muted">Chưa có ghi chú cho khách hàng này.</p>}</section></div>;
}

function SecondaryTab({ tab, client }: { tab: Exclude<ClientTab, 'overview'>; client: Client }) {
  const [files, setFiles] = useState<Array<{ id: string; name: string; uploadedAt: string }>>([]);
  const [channel, setChannel] = useState('');
  useEffect(() => {
    try {
      const storedFiles = window.localStorage.getItem(`cms-client-${client.id}-files`);
      const storedChannel = window.localStorage.getItem(`cms-client-${client.id}-channel`);
      if (storedFiles) setFiles(JSON.parse(storedFiles) as Array<{ id: string; name: string; uploadedAt: string }>);
      if (storedChannel) setChannel(storedChannel);
    } catch { /* Ignore malformed local demo state. */ }
  }, [client.id]);
  const addFile = (file: File) => {
    const next = [...files, { id: `local-${Date.now()}`, name: file.name, uploadedAt: new Date().toISOString() }];
    setFiles(next);
    window.localStorage.setItem(`cms-client-${client.id}-files`, JSON.stringify(next));
  };
  const saveChannel = (value: string) => { setChannel(value); window.localStorage.setItem(`cms-client-${client.id}-channel`, value); };
  const orders = useOrders({ query: client.name });
  const applications = useApplications({ query: client.name });
  const clientOrders = orders.data?.items.filter((order) => order.client.id === client.id) ?? [];
  const clientApplications = applications.data?.items.filter((application) => application.client.id === client.id) ?? [];
  if (tab === 'orders') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><p className="text-sm text-text-muted">Đơn tuyển đang hoạt động</p><p className="mt-2 text-3xl font-bold text-text">{client.activeOrders}</p><p className="mt-1 text-sm text-text-muted">Danh sách dưới đây được lọc theo khách hàng hiện tại.</p></section>{orders.isPending ? <LoadingState label="Đang tải đơn tuyển" /> : clientOrders.length ? <div className="space-y-3">{clientOrders.map((order) => <article key={order.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{order.code}</p><h3 className="mt-1 font-bold text-text">{order.position}</h3><p className="mt-1 text-sm text-text-muted">{order.industryLabel} · {order.location} · Hạn {new Date(order.deadline).toLocaleDateString('vi-VN')}</p></div><StatusLabel tone={order.health === 'FILLED' ? 'success' : 'warning'}>{order.status === 'RECRUITING' ? 'Đang tuyển' : order.status}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">{order.metrics.passed}/{order.metrics.target} đã trúng tuyển · {order.metrics.supplied} đã cung ứng</p></article>)}</div> : <EmptyState title="Chưa có đơn tuyển" description="Khách hàng này chưa có đơn tuyển phù hợp." />}</div>;
  if (tab === 'candidates') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><p className="text-sm text-text-muted">Ứng viên đã trúng tuyển qua khách hàng</p><p className="mt-2 text-3xl font-bold text-text">{client.passed}</p><p className="mt-1 text-sm text-text-muted">Dữ liệu lấy từ các đơn ứng tuyển thuộc khách hàng.</p></section>{applications.isPending ? <LoadingState label="Đang tải ứng viên" /> : clientApplications.length ? <div className="overflow-x-auto rounded-lg border border-border bg-panel"><table className="w-full min-w-[38rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-4 py-3">Ứng viên</th><th className="px-4 py-3">Đơn tuyển</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Cập nhật</th></tr></thead><tbody>{clientApplications.map((application) => <tr key={application.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-semibold text-text">{application.candidate.name}</p><p className="text-xs text-text-muted">{application.candidate.code}</p></td><td className="px-4 py-3 text-text">{application.order.code}</td><td className="px-4 py-3"><StatusLabel tone={application.status === 'PASSED' ? 'success' : application.status === 'FAILED' || application.status === 'WITHDRAWN' ? 'danger' : 'info'}>{application.status}</StatusLabel></td><td className="px-4 py-3 text-text-muted">{new Date(application.lastActivityAt).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có ứng viên" description="Khách hàng này chưa có đơn ứng tuyển phù hợp." />}</div>;
  if (tab === 'contacts') return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Đầu mối liên hệ</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Liên hệ chính" value={client.contactName ?? 'Chưa cập nhật'} /><InfoRow label="Khu vực" value={client.region} /><div><dt className="text-sm text-text-muted">Kênh liên hệ</dt><dd className="mt-1"><input aria-label="Kênh liên hệ" name="kenh-lien-he" value={channel} onChange={(event) => saveChannel(event.target.value)} placeholder="Email, điện thoại, LINE…" className="min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm" /></dd></div><InfoRow label="Người phụ trách nội bộ" value={client.owner.name} /></dl><p className="mt-3 text-xs text-text-muted">Kênh liên hệ được lưu cục bộ trong bản demo; khi có backend sẽ ghi audit theo client.</p></section>;
  if (tab === 'files') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-text">Ghi chú và tệp</h2>{client.notes ? <p className="mt-3 text-sm leading-6 text-text-muted">{client.notes}</p> : <p className="mt-3 text-sm text-text-muted">Chưa có ghi chú.</p>}</div><label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white">Thêm tệp<input className="sr-only" type="file" name="client-files" aria-label="Thêm tệp khách hàng" onChange={(event) => { const file = event.target.files?.[0]; if (file) addFile(file); event.currentTarget.value = ''; }} /></label></div>{files.length ? <ul className="mt-4 space-y-2">{files.map((file) => <li key={file.id} className="flex items-center justify-between rounded-control border border-border bg-surface px-3 py-3 text-sm"><span className="font-semibold text-text">{file.name}</span><span className="text-xs text-text-muted">{new Date(file.uploadedAt).toLocaleString('vi-VN')} · Đang chờ lưu tệp</span></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">Chưa có tệp đính kèm. Thêm hợp đồng, tiêu chí tuyển hoặc tài liệu trao đổi.</p>}</section></div>;
  return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Hoạt động gần đây</h2><ol className="mt-4 border-l border-border pl-5"><li className="relative pb-2"><span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent" /><p className="text-sm font-semibold text-text">Cập nhật thông tin khách hàng</p><p className="mt-1 text-sm text-text-muted">{new Date(client.lastActivity).toLocaleString('vi-VN')}</p><p className="mt-2 text-sm text-text-muted">{client.notes ?? 'Chưa có mô tả chi tiết cho hoạt động này.'}</p></li></ol></section>;
}

export function ClientProfileContent({ client, activeTab, onTabChange, onEdit }: { client: Client; activeTab: ClientTab; onTabChange: (tab: ClientTab) => void; onEdit?: () => void }) {
  const handleTabKeyDown = useTabKeyboard(clientTabs.map(({ id }) => id), (value) => onTabChange(value as ClientTab));
  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-accent">{client.code}</p><h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{client.name}</h1><p className="mt-2 text-sm text-text-muted">{client.organizationType} · {client.region} · Phụ trách {client.owner.name}</p><div className="mt-3 flex flex-wrap gap-2"><StatusLabel tone={client.status === 'ACTIVE' ? 'success' : client.status === 'PAUSED' ? 'warning' : 'neutral'}>{statusLabel(client.status)}</StatusLabel>{client.industryLabels.map((industry) => <StatusLabel key={industry} tone="info">{industry}</StatusLabel>)}</div></div><div className="flex flex-wrap items-end gap-2"><Button variant="secondary" onClick={onEdit}>Chỉnh sửa</Button><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm"><p className="text-text-muted">Hoạt động cuối</p><p className="mt-1 font-semibold text-text">{new Date(client.lastActivity).toLocaleString('vi-VN')}</p></div></div></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Đơn đang tuyển" value={client.activeOrders} detail="Đang theo dõi" /><KpiCard label="Chỉ tiêu" value={client.target} detail="Nhu cầu cung ứng" /><KpiCard label="Đã trúng tuyển" value={client.passed} detail="Tổng đã đạt" /><KpiCard label="Tỷ lệ đạt" value={client.target ? Math.round((client.passed / client.target) * 100) : 0} detail="So với chỉ tiêu" /></section><nav className="-mx-1 overflow-x-auto border-b border-border" aria-label="Các phần hồ sơ khách hàng" role="tablist" onKeyDown={handleTabKeyDown}><div className="flex min-w-max gap-1 px-1">{clientTabs.map((tab) => <button key={tab.id} type="button" role="tab" data-tab-value={tab.id} tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}>{tab.label}</button>)}</div></nav>{activeTab === 'overview' ? <OverviewTab client={client} /> : <SecondaryTab tab={activeTab} client={client} />}</div>;
}
