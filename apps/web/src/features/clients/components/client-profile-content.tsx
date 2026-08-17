import type { Client } from '../services/client-types';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusLabel } from '@/components/ui/status-label';

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
  if (tab === 'orders') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><p className="text-sm text-text-muted">Đơn tuyển đang hoạt động</p><p className="mt-2 text-3xl font-bold text-text">{client.activeOrders}</p><p className="mt-1 text-sm text-text-muted">Các đơn chi tiết sẽ được lọc theo khách hàng này.</p></section><EmptyState title="Chưa có danh sách đơn chi tiết" description="Khu vực này sẽ hiển thị vị trí, chỉ tiêu, hạn tuyển và sức khỏe từng đơn khi module Đơn hàng được liên kết." /></div>;
  if (tab === 'candidates') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><p className="text-sm text-text-muted">Ứng viên đã trúng tuyển qua khách hàng</p><p className="mt-2 text-3xl font-bold text-text">{client.passed}</p><p className="mt-1 text-sm text-text-muted">Số liệu tổng hợp từ các đơn đang và đã hoàn tất.</p></section><EmptyState title="Chưa có danh sách ứng viên chi tiết" description="Danh sách ứng viên, trạng thái hồ sơ và lộ trình cung ứng sẽ được mở từ module Ứng viên." /></div>;
  if (tab === 'contacts') return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Đầu mối liên hệ</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Liên hệ chính" value={client.contactName ?? 'Chưa cập nhật'} /><InfoRow label="Khu vực" value={client.region} /><InfoRow label="Kênh liên hệ" value="Chưa cập nhật" /><InfoRow label="Người phụ trách nội bộ" value={client.owner.name} /></dl></section>;
  if (tab === 'files') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Ghi chú</h2>{client.notes ? <p className="mt-3 text-sm leading-6 text-text-muted">{client.notes}</p> : <p className="mt-3 text-sm text-text-muted">Chưa có ghi chú.</p>}</section><EmptyState title="Chưa có tệp đính kèm" description="Tệp hợp đồng, tiêu chí tuyển và tài liệu trao đổi sẽ được lưu tại đây khi hộp thư và tài liệu được liên kết." /></div>;
  return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="text-base font-bold text-text">Hoạt động gần đây</h2><ol className="mt-4 border-l border-border pl-5"><li className="relative pb-2"><span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent" /><p className="text-sm font-semibold text-text">Cập nhật thông tin khách hàng</p><p className="mt-1 text-sm text-text-muted">{new Date(client.lastActivity).toLocaleString('vi-VN')}</p><p className="mt-2 text-sm text-text-muted">{client.notes ?? 'Chưa có mô tả chi tiết cho hoạt động này.'}</p></li></ol></section>;
}

export function ClientProfileContent({ client, activeTab, onTabChange }: { client: Client; activeTab: ClientTab; onTabChange: (tab: ClientTab) => void }) {
  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-accent">{client.code}</p><h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{client.name}</h1><p className="mt-2 text-sm text-text-muted">{client.organizationType} · {client.region} · Phụ trách {client.owner.name}</p><div className="mt-3 flex flex-wrap gap-2"><StatusLabel tone={client.status === 'ACTIVE' ? 'success' : client.status === 'PAUSED' ? 'warning' : 'neutral'}>{statusLabel(client.status)}</StatusLabel>{client.industryLabels.map((industry) => <StatusLabel key={industry} tone="info">{industry}</StatusLabel>)}</div></div><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm"><p className="text-text-muted">Hoạt động cuối</p><p className="mt-1 font-semibold text-text">{new Date(client.lastActivity).toLocaleString('vi-VN')}</p></div></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Đơn đang tuyển" value={client.activeOrders} detail="Đang theo dõi" /><KpiCard label="Chỉ tiêu" value={client.target} detail="Nhu cầu cung ứng" /><KpiCard label="Đã trúng tuyển" value={client.passed} detail="Tổng đã đạt" /><KpiCard label="Tỷ lệ đạt" value={client.target ? Math.round((client.passed / client.target) * 100) : 0} detail="So với chỉ tiêu" /></section><nav className="-mx-1 overflow-x-auto border-b border-border" aria-label="Các phần hồ sơ khách hàng" role="tablist"><div className="flex min-w-max gap-1 px-1">{clientTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}>{tab.label}</button>)}</div></nav>{activeTab === 'overview' ? <OverviewTab client={client} /> : <SecondaryTab tab={activeTab} client={client} />}</div>;
}
