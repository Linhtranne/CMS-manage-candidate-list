'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useCandidate } from '../services/candidate-queries';
import { candidatePhaseLabel } from './candidate-table';
import { CandidateEditModal } from './candidate-edit-modal';
import { Button } from '@/components/ui/button';

const tabs = [
  ['overview', 'Tổng quan'],
  ['applications', 'Ứng tuyển'],
  ['journeys', 'Lộ trình cung ứng'],
  ['email', 'Email'],
  ['files', 'Tệp & ghi chú'],
  ['history', 'Lịch sử']
] as const;

export type CandidateTab = (typeof tabs)[number][0];

function InfoRow({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-sm text-text-muted">{label}</dt><dd className="mt-1 font-semibold text-text">{value ?? 'Chưa cập nhật'}</dd></div>;
}

function OverviewTab({ candidate }: { candidate: NonNullable<ReturnType<typeof useCandidate>['data']> }) {
  return <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Thông tin hồ sơ</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Mã ứng viên" value={candidate.code} /><InfoRow label="Họ và tên" value={candidate.name} /><InfoRow label="Ngành nghề" value={candidate.industryLabels.join(', ')} /><InfoRow label="Nghề nghiệp chính" value={candidate.occupation} /><InfoRow label="Tiếng Nhật" value={candidate.japaneseLevel} /><InfoRow label="Nguồn hồ sơ" value={candidate.source} /></dl></section><section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Liên hệ và phụ trách</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><InfoRow label="Email" value={candidate.email ?? candidate.emailMasked ?? 'Chưa cập nhật'} /><InfoRow label="Điện thoại" value={candidate.phone ?? candidate.phoneMasked ?? 'Chưa cập nhật'} /><InfoRow label="Khu vực" value={candidate.address ?? 'Chưa cập nhật'} /><InfoRow label="Phụ trách" value={candidate.owner.name} /></dl><div className="mt-5 rounded-control border border-border bg-surface p-4"><p className="text-sm text-text-muted">Việc tiếp theo</p><p className="mt-1 font-semibold text-accent">{candidate.nextAction}</p></div></section><section className="rounded-lg border border-border bg-panel p-5 lg:col-span-2"><h2 className="font-bold text-text">Hồ sơ đa ngành</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{candidate.occupationProfiles.map((profile) => <div key={`${profile.industryLabel}-${profile.occupation}`} className="rounded-control border border-border bg-surface p-4"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-text">{profile.occupation}</p><StatusLabel tone={profile.status === 'PRIMARY' ? 'info' : 'neutral'}>{profile.industryLabel}</StatusLabel></div><p className="mt-2 text-sm text-text-muted">{profile.yearsExperience} năm kinh nghiệm</p><p className="mt-2 text-sm text-text-muted">{profile.skills.join(', ') || 'Chưa cập nhật kỹ năng'}</p></div>)}</div></section></div>;
}

function ApplicationsTab({ candidate }: { candidate: NonNullable<ReturnType<typeof useCandidate>['data']> }) {
  if (!candidate.applications.length) return <EmptyState title="Chưa có đơn ứng tuyển" description="Ứng viên này hiện chưa được thêm vào đơn tuyển nào." />;
  return <div className="space-y-3">{candidate.applications.map((application) => <section key={application.id} className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-text">{application.order.code} · {application.order.position}</p><p className="mt-1 text-sm text-text-muted">{application.client.name} · Phụ trách {application.owner.name}</p></div><StatusLabel tone={application.status === 'PASSED' ? 'success' : 'info'}>{application.status === 'PASSED' ? 'Đã trúng tuyển' : application.status === 'IN_INTERVIEW_PROCESS' ? 'Đang phỏng vấn' : 'Mới ghép'}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">Cập nhật cuối {new Date(application.lastActivityAt).toLocaleString('vi-VN')}</p></section>)}</div>;
}

function JourneysTab({ candidate }: { candidate: NonNullable<ReturnType<typeof useCandidate>['data']> }) {
  if (!candidate.journeys.length) return <EmptyState title="Chưa có lộ trình cung ứng" description="Lộ trình sẽ xuất hiện sau khi một đơn ứng tuyển được xác nhận trúng tuyển." />;
  return <div className="space-y-3">{candidate.journeys.map((journey) => <section key={journey.id} className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-text">{journey.templateName}</p><p className="mt-1 text-sm text-text-muted">{journey.order.code} · {journey.client.name}</p></div><StatusLabel tone={journey.health === 'AT_RISK' ? 'warning' : journey.status === 'COMPLETED' ? 'success' : 'info'}>{journey.currentMilestone}</StatusLabel></div><p className="mt-3 text-sm text-text-muted">Tiến độ {journey.progress.completed}/{journey.progress.applicable} mốc · Phụ trách {journey.owner.name}</p></section>)}</div>;
}

function SecondaryTab({ tab, candidate }: { tab: Exclude<CandidateTab, 'overview' | 'applications' | 'journeys'>; candidate: NonNullable<ReturnType<typeof useCandidate>['data']> }) {
  if (tab === 'email') return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Lịch sử email</h2><p className="mt-2 text-sm text-text-muted">{candidate.emailCount} email đã được lưu vết trong hộp thư chung. Nội dung chi tiết sẽ mở từ module Hộp thư chung.</p></section>;
  if (tab === 'files') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Tệp đính kèm</h2>{candidate.files.length ? <ul className="mt-4 space-y-2">{candidate.files.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-3"><span className="font-semibold text-text">{file.fileName}</span><StatusLabel tone={file.scanStatus === 'SAFE' ? 'success' : 'warning'}>{file.scanStatus === 'SAFE' ? 'Đã quét an toàn' : file.scanStatus}</StatusLabel></li>)}</ul> : <p className="mt-3 text-sm text-text-muted">Chưa có tệp đính kèm.</p>}</section><section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Ghi chú nội bộ</h2>{candidate.notes.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">{candidate.notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="mt-3 text-sm text-text-muted">Chưa có ghi chú.</p>}</section></div>;
  return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Lịch sử hồ sơ</h2><ol className="mt-4 space-y-4 border-l border-border pl-5">{candidate.history.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent" /><p className="font-semibold text-text">{event.summary}</p><p className="mt-1 text-sm text-text-muted">{new Date(event.occurredAt).toLocaleString('vi-VN')} · {event.actor.name}</p></li>)}</ol></section>;
}

export function CandidateDetailPage({ candidateId }: { candidateId: string }) {
  const query = useCandidate(candidateId);
  const [activeTab, setActiveTab] = useState<CandidateTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const candidate = query.data;
  if (query.isPending) return <LoadingState label="Đang tải hồ sơ ứng viên" />;
  if (query.error || !candidate) return <ErrorState message="Không thể tải hồ sơ ứng viên." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-accent">{candidate.code}</p><h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{candidate.name}</h1><p className="mt-2 text-sm text-text-muted">{candidate.occupation} · {candidate.industryLabels.join(', ')} · Phụ trách {candidate.owner.name}</p><div className="mt-3 flex flex-wrap gap-2"><StatusLabel tone="info">{candidatePhaseLabel(candidate.operationalPhase) === 'Tiềm năng' ? 'Ứng viên tiềm năng' : candidatePhaseLabel(candidate.operationalPhase)}</StatusLabel><StatusLabel tone={candidate.recordStatus === 'ACTIVE' ? 'success' : 'neutral'}>{candidate.recordStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}</StatusLabel></div></div><div className="flex flex-wrap items-end gap-2"><Button onClick={() => setEditOpen(true)}>Chỉnh sửa hồ sơ</Button><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm"><p className="text-text-muted">Cập nhật cuối</p><p className="mt-1 font-semibold text-text">{new Date(candidate.lastActivityAt).toLocaleString('vi-VN')}</p></div></div></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Đơn ứng tuyển</p><p className="mt-2 text-2xl font-bold text-text">{candidate.applicationCount}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Email lưu vết</p><p className="mt-2 text-2xl font-bold text-text">{candidate.emailCount}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Hồ sơ nghề nghiệp</p><p className="mt-2 text-2xl font-bold text-text">{candidate.occupationProfiles.length}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Việc tiếp theo</p><p className="mt-2 font-semibold text-accent">{candidate.nextAction}</p></div></section><nav className="-mx-1 overflow-x-auto border-b border-border" aria-label="Các phần hồ sơ ứng viên" role="tablist"><div className="flex min-w-max gap-1 px-1">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}>{label}</button>)}</div></nav>{activeTab === 'overview' ? <OverviewTab candidate={candidate} /> : activeTab === 'applications' ? <ApplicationsTab candidate={candidate} /> : activeTab === 'journeys' ? <JourneysTab candidate={candidate} /> : <SecondaryTab tab={activeTab} candidate={candidate} />}<CandidateEditModal candidate={candidate} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void query.refetch(); }} /></div>;
}
