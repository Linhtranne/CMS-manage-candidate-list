'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { AddCandidatesDialog } from './add-candidates-dialog';
import { OrderStatusForm } from './order-status-form';

export const orderTabs = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'criteria', label: 'Tiêu chí tuyển' },
  { id: 'candidates', label: 'Ứng viên trong pipeline' },
  { id: 'interviews', label: 'Kết quả phỏng vấn' },
  { id: 'journey', label: 'Tiến độ cung ứng' },
  { id: 'files', label: 'Tệp và ghi chú' },
  { id: 'history', label: 'Lịch sử thay đổi' }
] as const;

export type OrderTab = (typeof orderTabs)[number]['id'];

const tabDescriptions: Record<Exclude<OrderTab, 'overview' | 'criteria'>, string> = {
  candidates: 'Theo dõi các hồ sơ đang được xem xét, phỏng vấn hoặc chờ kết quả trong đơn tuyển này.',
  interviews: 'Các vòng phỏng vấn và kết quả được liên kết với từng ứng viên trong pipeline.',
  journey: 'Sau khi trúng tuyển, hồ sơ chuyển sang lộ trình cung ứng và các mốc bàn giao phù hợp.',
  files: 'Tệp, ghi chú và bằng chứng nghiệp vụ được lưu cùng đơn tuyển.',
  history: 'Mọi thay đổi quan trọng của đơn tuyển được lưu theo actor và thời điểm.'
};

function healthLabel(health: JobOrder['health']) {
  if (health === 'UNDER_TARGET') return 'Thiếu ứng viên';
  if (health === 'INTERVIEW_DELAY') return 'Chậm phỏng vấn';
  if (health === 'EXPIRING') return 'Sắp hết hạn';
  return health;
}

export function OrderProfileContent({ order, activeTab, onTabChange }: { order: JobOrder; activeTab: OrderTab; onTabChange: (tab: OrderTab) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const metrics = [
    { label: 'Chỉ tiêu', value: order.metrics.target },
    { label: 'Đang xử lý', value: order.metrics.activeApplications },
    { label: 'Trúng tuyển', value: order.metrics.passed },
    { label: 'Đã cung ứng', value: order.metrics.supplied }
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-accent">{order.code} · {order.industryLabel}</p>
        <h3 className="mt-1 text-2xl font-bold text-text">{order.position}</h3>
        <p className="mt-2 text-sm text-text-muted">{order.client.name} · {order.location} · Hạn {new Date(order.deadline).toLocaleDateString('vi-VN')}</p>
      </div>
      <Button variant="primary" onClick={() => setDialogOpen(true)}>Thêm ứng viên vào đơn</Button>
    </div>

    <div role="tablist" aria-label="Các phần hồ sơ đơn tuyển" className="flex gap-2 overflow-x-auto border-b border-border pb-2">
      {orderTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)} className={`shrink-0 rounded-control px-3 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-[#e8f1fb] text-accent' : 'text-text-muted hover:bg-surface'}`}>{tab.label}</button>)}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => <section key={metric.label} className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">{metric.label}</p><p className="mt-2 text-2xl font-bold text-text">{metric.value}</p></section>)}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <StatusLabel tone="info">{order.industryLabel}</StatusLabel>
      <StatusLabel tone={order.health === 'FILLED' ? 'success' : 'warning'}>{healthLabel(order.health)}</StatusLabel>
      <span className="text-sm text-text-muted">Phụ trách {order.owner.name}</span>
    </div>

    {activeTab === 'overview' || activeTab === 'criteria' ? <section className="rounded-lg border border-border bg-surface p-4">
      <h4 className="text-sm font-semibold text-text">Tiêu chí tuyển dụng</h4>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-muted">{(order.criteria ?? []).map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-text-muted">Loại hợp đồng</dt><dd className="mt-1 font-semibold text-text">{order.contractType}</dd></div>
        <div><dt className="text-text-muted">Mức lương</dt><dd className="mt-1 font-semibold text-text">{order.salary}</dd></div>
        <div><dt className="text-text-muted">Tiếng Nhật</dt><dd className="mt-1 font-semibold text-text">{order.japaneseLevel}</dd></div>
        <div><dt className="text-text-muted">Nghề tuyển</dt><dd className="mt-1 font-semibold text-text">{order.occupation}</dd></div>
      </dl>
    </section> : <section className="rounded-lg border border-border bg-surface p-4"><h4 className="text-sm font-semibold text-text">{orderTabs.find((tab) => tab.id === activeTab)?.label}</h4><p className="mt-2 text-sm text-text-muted">{tabDescriptions[activeTab]}</p></section>}

    {activeTab === 'overview' ? <div className="rounded-lg border border-border bg-panel p-4"><h4 className="text-sm font-semibold text-text">Trạng thái đơn tuyển</h4><div className="mt-3 max-w-md">{saved ? <p role="status" className="mb-4 rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">Đã lưu thay đổi</p> : null}<OrderStatusForm order={order} onSaved={() => setSaved(true)} /></div></div> : null}
    <AddCandidatesDialog orderId={order.id} open={dialogOpen} onClose={() => setDialogOpen(false)} />
  </div>;
}
