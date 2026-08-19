'use client';

import { useEffect, useState } from 'react';
import { useDetailTab } from '@/hooks/use-detail-tab';
import { useTabKeyboard } from '@/hooks/use-tab-keyboard';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useCandidate } from '../services/candidate-queries';
import { candidatePhaseLabel } from './candidate-table';
import { CandidateEditModal } from './candidate-edit-modal';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

const tabs = [
  ['overview', 'Tổng quan'],
  ['applications', 'Ứng tuyển'],
  ['journeys', 'Lộ trình cung ứng'],
  ['work', 'Công việc & ghi chú'],
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
  const [files, setFiles] = useState(candidate.files);
  const [notes, setNotes] = useState(candidate.notes);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  useEffect(() => {
    try {
      const storedNotes = window.localStorage.getItem(`cms-candidate-${candidate.id}-notes`);
      const storedFiles = window.localStorage.getItem(`cms-candidate-${candidate.id}-files`);
      if (storedNotes) setNotes([...candidate.notes, ...(JSON.parse(storedNotes) as string[])]);
      if (storedFiles) setFiles([...candidate.files, ...(JSON.parse(storedFiles) as typeof candidate.files)]);
    } catch { /* Ignore malformed local demo state. */ }
  }, [candidate.files, candidate.id, candidate.notes]);
  const addNote = () => { if (!noteDraft.trim()) return; const next = [...notes, noteDraft.trim()]; setNotes(next); window.localStorage.setItem(`cms-candidate-${candidate.id}-notes`, JSON.stringify(next.slice(candidate.notes.length))); setNoteDraft(''); setNoteOpen(false); };
  const addFile = (file: File) => { const item = { id: `local-${Date.now()}`, fileName: file.name, category: 'OTHER' as const, scanStatus: 'PENDING' as const, uploadedAt: new Date().toISOString(), downloadUrl: null }; const next = [...files, item]; setFiles(next); window.localStorage.setItem(`cms-candidate-${candidate.id}-files`, JSON.stringify(next.slice(candidate.files.length))); };
  if (tab === 'work') return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text">Công việc và ghi chú nội bộ</h2><p className="mt-2 text-sm text-text-muted">Theo dõi việc tiếp theo: {candidate.nextAction}.</p></div><Button variant="primary" size="sm" onClick={() => { setNoteDraft(''); setNoteOpen(true); }}>Thêm ghi chú</Button></div>{notes.length ? <ul className="space-y-2">{notes.map((note, index) => <li key={`${note}-${index}`} className="rounded-lg border border-border bg-panel p-4 text-sm text-text">{note}</li>)}</ul> : <EmptyState title="Chưa có ghi chú" description="Thêm ghi chú nội bộ để bàn giao xử lý giữa các nhân viên." />}<Modal open={noteOpen} title="Thêm ghi chú ứng viên" description="Ghi chú chỉ hiển thị cho nhân viên nội bộ." onClose={() => setNoteOpen(false)} size="sm" footer={<><Button onClick={() => setNoteOpen(false)}>Hủy</Button><Button variant="primary" disabled={!noteDraft.trim()} onClick={addNote}>Lưu ghi chú</Button></>}><label className="block text-sm font-semibold text-text">Nội dung<textarea aria-label="Nội dung ghi chú ứng viên" name="noi-dung-ghi-chu-ung-vien" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="mt-1 min-h-28 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></Modal></section>;
  if (tab === 'email') return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Lịch sử email</h2><p className="mt-2 text-sm text-text-muted">{candidate.emailCount} email đã được lưu vết trong hộp thư chung.</p><a href={`/mailbox?query=${encodeURIComponent(candidate.name)}`} className="mt-4 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]">Mở hộp thư với bộ lọc ứng viên</a></section>;
  if (tab === 'files') return <div className="space-y-4"><section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-text">Tệp đính kèm</h2><label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white">Thêm tệp<input className="sr-only" type="file" name="candidate-files" aria-label="Thêm tệp ứng viên" onChange={(event) => { const file = event.target.files?.[0]; if (file) addFile(file); event.currentTarget.value = ''; }} /></label></div>{files.length ? <ul className="mt-4 space-y-2">{files.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-3"><span className="font-semibold text-text">{file.fileName}</span><div className="flex items-center gap-3"><StatusLabel tone={file.scanStatus === 'SAFE' ? 'success' : file.scanStatus === 'QUARANTINED' || file.scanStatus === 'REJECTED' ? 'danger' : 'warning'}>{file.scanStatus === 'SAFE' ? 'Đã quét an toàn' : 'Đang kiểm tra'}</StatusLabel>{file.downloadUrl ? <a href={file.downloadUrl} className="text-sm font-semibold text-accent underline">Tải xuống</a> : null}</div></li>)}</ul> : <p className="mt-3 text-sm text-text-muted">Chưa có tệp đính kèm.</p>}</section><section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Ghi chú nội bộ</h2>{notes.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-muted">{notes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="mt-3 text-sm text-text-muted">Chưa có ghi chú.</p>}</section></div>;
  return <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Lịch sử hồ sơ</h2><ol className="mt-4 space-y-4 border-l border-border pl-5">{candidate.history.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent" /><p className="font-semibold text-text">{event.summary}</p><p className="mt-1 text-sm text-text-muted">{new Date(event.occurredAt).toLocaleString('vi-VN')} · {event.actor.name}</p></li>)}</ol></section>;
}

export function CandidateDetailPage({ candidateId }: { candidateId: string }) {
  const query = useCandidate(candidateId);
  const [activeTab, setActiveTab] = useDetailTab<CandidateTab>('overview');
  const handleTabKeyDown = useTabKeyboard(tabs.map(([id]) => id), (value) => setActiveTab(value as CandidateTab));
  const [editOpen, setEditOpen] = useState(false);
  const candidate = query.data;
  if (query.isPending) return <LoadingState label="Đang tải hồ sơ ứng viên" />;
  if (query.error || !candidate) return <ErrorState message="Không thể tải hồ sơ ứng viên." onRetry={() => void query.refetch()} />;
  return <div className="space-y-6"><header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-accent">{candidate.code}</p><h1 className="mt-1 text-2xl font-bold text-text md:text-3xl">{candidate.name}</h1><p className="mt-2 text-sm text-text-muted">{candidate.occupation} · {candidate.industryLabels.join(', ')} · Phụ trách {candidate.owner.name}</p><div className="mt-3 flex flex-wrap gap-2"><StatusLabel tone="info">{candidatePhaseLabel(candidate.operationalPhase) === 'Tiềm năng' ? 'Ứng viên tiềm năng' : candidatePhaseLabel(candidate.operationalPhase)}</StatusLabel><StatusLabel tone={candidate.recordStatus === 'ACTIVE' ? 'success' : 'neutral'}>{candidate.recordStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}</StatusLabel></div></div><div className="flex flex-wrap items-end gap-2"><Button onClick={() => setEditOpen(true)}>Chỉnh sửa hồ sơ</Button><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm"><p className="text-text-muted">Cập nhật cuối</p><p className="mt-1 font-semibold text-text">{new Date(candidate.lastActivityAt).toLocaleString('vi-VN')}</p></div></div></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Đơn ứng tuyển</p><p className="mt-2 text-2xl font-bold text-text">{candidate.applicationCount}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Email lưu vết</p><p className="mt-2 text-2xl font-bold text-text">{candidate.emailCount}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Hồ sơ nghề nghiệp</p><p className="mt-2 text-2xl font-bold text-text">{candidate.occupationProfiles.length}</p></div><div className="rounded-lg border border-border bg-panel p-4"><p className="text-sm text-text-muted">Việc tiếp theo</p><p className="mt-2 font-semibold text-accent">{candidate.nextAction}</p></div></section><nav className="-mx-1 overflow-x-auto border-b border-border" aria-label="Các phần hồ sơ ứng viên" role="tablist" onKeyDown={handleTabKeyDown}><div className="flex min-w-max gap-1 px-1">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" data-tab-value={id} tabIndex={activeTab === id ? 0 : -1} aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:border-border hover:text-text'}`}>{label}</button>)}</div></nav>{activeTab === 'overview' ? <OverviewTab candidate={candidate} /> : activeTab === 'applications' ? <ApplicationsTab candidate={candidate} /> : activeTab === 'journeys' ? <JourneysTab candidate={candidate} /> : <SecondaryTab tab={activeTab} candidate={candidate} />}<CandidateEditModal candidate={candidate} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); void query.refetch(); }} /></div>;
}
