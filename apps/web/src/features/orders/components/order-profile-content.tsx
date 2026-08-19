'use client';

import { useState } from 'react';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import type { JobOrder } from '@/mocks/fixtures/orders';
import { useApplications } from '@/features/applications/services/application-queries';
import { useJourneys } from '@/features/journeys/services/journey-queries';
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

function healthLabel(health: JobOrder['health']) {
  if (health === 'UNDER_TARGET') return 'Thiếu ứng viên';
  if (health === 'INTERVIEW_DELAY') return 'Chậm phỏng vấn';
  if (health === 'EXPIRING') return 'Sắp hết hạn';
  return health;
}

function OrderTabContent({ order, activeTab }: { order: JobOrder; activeTab: Exclude<OrderTab, 'overview' | 'criteria'> }) {
  const applications = useApplications({ orderId: order.id });
  const journeys = useJourneys({ query: order.code });
  const [files, setFiles] = useState<Array<{ id: string; name: string; uploadedAt: string }>>([]);
  const [note, setNote] = useState('');
  if (activeTab === 'files') return <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-bold text-text">Tệp và ghi chú</h4><label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white">Thêm tệp<input className="sr-only" type="file" name="order-files" aria-label="Thêm tệp đơn tuyển" onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((current) => [...current, { id: `local-${Date.now()}`, name: file.name, uploadedAt: new Date().toISOString() }]); event.currentTarget.value = ''; }} /></label></div><label className="mt-4 block text-sm font-semibold text-text">Ghi chú đơn tuyển<textarea aria-label="Ghi chú đơn tuyển" name="ghi-chu-don-tuyen" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú vận hành nội bộ" className="mt-1 min-h-24 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label>{files.length ? <ul className="mt-4 space-y-2">{files.map((file) => <li key={file.id} className="flex items-center justify-between rounded-control border border-border bg-surface px-3 py-3 text-sm"><span className="font-semibold text-text">{file.name}</span><span className="text-xs text-text-muted">{new Date(file.uploadedAt).toLocaleString('vi-VN')} · Chờ lưu tệp</span></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">Chưa có tệp đính kèm. Thêm hợp đồng, tiêu chí tuyển hoặc tài liệu trao đổi.</p>}<p className="mt-4 rounded-control bg-surface p-3 text-sm text-text">Tiêu chí hiện tại: {(order.criteria ?? []).join(' · ') || 'Chưa khai báo'}</p></section>;
  if (activeTab === 'history') return <section className="rounded-lg border border-border bg-panel p-5"><h4 className="font-bold text-text">Lịch sử thay đổi</h4><ol className="mt-4 space-y-3 border-l border-border pl-5"><li><p className="font-semibold text-text">Tạo đơn tuyển</p><p className="mt-1 text-sm text-text-muted">Phiên bản dữ liệu {order.version} · phụ trách {order.owner.name}</p></li><li><p className="font-semibold text-text">Cập nhật trạng thái hiện tại</p><p className="mt-1 text-sm text-text-muted">{order.status === 'RECRUITING' ? 'Đang tuyển' : order.status}</p></li></ol></section>;
  if (applications.isPending || journeys.isPending) return <LoadingState label="Đang tải dữ liệu liên quan" />;
  const orderApplications = applications.data?.items ?? [];
  if (activeTab === 'candidates') return orderApplications.length ? <div className="overflow-x-auto rounded-lg border border-border bg-panel"><table className="w-full min-w-[40rem] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-4 py-3">Ứng viên</th><th className="px-4 py-3">Giai đoạn</th><th className="px-4 py-3">Phỏng vấn</th><th className="px-4 py-3">Cập nhật</th></tr></thead><tbody>{orderApplications.map((application) => <tr key={application.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-semibold text-text">{application.candidate.name}</p><p className="text-xs text-text-muted">{application.candidate.code}</p></td><td className="px-4 py-3"><StatusLabel tone={application.status === 'PASSED' ? 'success' : application.status === 'FAILED' || application.status === 'WITHDRAWN' ? 'danger' : 'info'}>{application.status}</StatusLabel></td><td className="px-4 py-3 text-text">{application.interviews.length} vòng</td><td className="px-4 py-3 text-text-muted">{new Date(application.lastActivityAt).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có ứng viên trong pipeline" description="Dùng nút Thêm ứng viên vào đơn để bắt đầu pipeline." />;
  if (activeTab === 'interviews') {
    const interviews = orderApplications.flatMap((application) => application.interviews.map((interview) => ({ application, interview })));
    return interviews.length ? <div className="space-y-3">{interviews.map(({ application, interview }) => <article key={interview.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-text">{application.candidate.name} · vòng {interview.round}</p><p className="mt-1 text-sm text-text-muted">{new Date(interview.scheduledAt).toLocaleString('vi-VN')} · {interview.mode === 'ONLINE' ? 'Trực tuyến' : 'Trực tiếp'}</p></div><StatusLabel tone={interview.scheduleStatus === 'COMPLETED' ? 'success' : 'warning'}>{interview.scheduleStatus}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">Kết quả: {interview.result === 'PENDING' ? 'Chưa có' : interview.result === 'PASS' ? 'Đạt' : 'Không đạt'}</p></article>)}</div> : <EmptyState title="Chưa có vòng phỏng vấn" description="Lịch phỏng vấn của ứng viên sẽ xuất hiện ở đây." />;
  }
  const matchingJourneys = journeys.data?.items.filter((journey) => journey.order.code === order.code) ?? [];
  return matchingJourneys.length ? <div className="space-y-3">{matchingJourneys.map((journey) => <article key={journey.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-text">{journey.candidate.name}</p><p className="mt-1 text-sm text-text-muted">{journey.templateName} · {journey.currentMilestone}</p></div><StatusLabel tone={journey.health === 'AT_RISK' ? 'danger' : 'success'}>{journey.health}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">Tiến độ {journey.progress.completed}/{journey.progress.applicable} mốc</p></article>)}</div> : <EmptyState title="Chưa có lộ trình cung ứng" description="Lộ trình sẽ xuất hiện sau khi ứng viên trong đơn được xác nhận trúng tuyển." />;
}

export function OrderProfileContent({ order, activeTab, onTabChange }: { order: JobOrder; activeTab: OrderTab; onTabChange: (tab: OrderTab) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleTabKeyDown = useTabKeyboard(orderTabs.map(({ id }) => id), (value) => onTabChange(value as OrderTab));
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
        <h1 className="mt-1 text-2xl font-bold text-text">{order.position}</h1>
        <p className="mt-2 text-sm text-text-muted">{order.client.name} · {order.location} · Hạn {new Date(order.deadline).toLocaleDateString('vi-VN')}</p>
      </div>
      <Button variant="primary" onClick={() => setDialogOpen(true)}>Thêm ứng viên vào đơn</Button>
    </div>

    <div role="tablist" aria-label="Các phần hồ sơ đơn tuyển" onKeyDown={handleTabKeyDown} className="flex gap-2 overflow-x-auto border-b border-border pb-2">
      {orderTabs.map((tab) => <button key={tab.id} type="button" role="tab" data-tab-value={tab.id} tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)} className={`shrink-0 rounded-control px-3 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-[#e8f1fb] text-accent' : 'text-text-muted hover:bg-surface'}`}>{tab.label}</button>)}
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
    </section> : <OrderTabContent order={order} activeTab={activeTab} />}

    {activeTab === 'overview' ? <div className="rounded-lg border border-border bg-panel p-4"><h4 className="text-sm font-semibold text-text">Trạng thái đơn tuyển</h4><div className="mt-3 max-w-md">{saved ? <p role="status" className="mb-4 rounded-lg border border-[#b8dfc8] bg-[#f3fbf6] p-3 text-sm font-semibold text-success">Đã lưu thay đổi</p> : null}<OrderStatusForm order={order} onSaved={() => setSaved(true)} /></div></div> : null}
    <AddCandidatesDialog orderId={order.id} open={dialogOpen} onClose={() => setDialogOpen(false)} />
  </div>;
}
