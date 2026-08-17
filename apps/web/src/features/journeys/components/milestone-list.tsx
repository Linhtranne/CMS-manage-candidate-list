'use client';

import { useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { deriveWaitingView } from '../domain/derive-journey-health';
import { MilestoneForm } from './milestone-form';
import { WaiveMilestoneDialog } from './waive-milestone-dialog';

type Journey = components['schemas']['SupplyJourneyDetail'];
type Milestone = components['schemas']['JourneyMilestone'];
const statusLabels: Record<Milestone['status'], string> = { NOT_STARTED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang xử lý', COMPLETED: 'Hoàn tất', BLOCKED: 'Đang bị chặn', WAIVED: 'Đã miễn trừ', NOT_APPLICABLE: 'Không áp dụng' };
const statusTone: Record<Milestone['status'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = { NOT_STARTED: 'neutral', IN_PROGRESS: 'info', COMPLETED: 'success', BLOCKED: 'danger', WAIVED: 'warning', NOT_APPLICABLE: 'neutral' };
const waitingLabels = { WAITING_CANDIDATE: 'Chờ ứng viên', WAITING_EXTERNAL: 'Chờ đối tác', BLOCKED: 'Bị chặn' } as const;

export function MilestoneList({ journey, canWaive }: { journey: Journey; canWaive: boolean }) {
  const [editingId, setEditingId] = useState<string>();
  const [waiveMilestone, setWaiveMilestone] = useState<Milestone>();
  const [saved, setSaved] = useState(false);
  return <div className="space-y-3" aria-label="Danh sách mốc lộ trình">{saved ? <p role="status" className="rounded-control bg-[#e8f5ee] px-3 py-2 text-sm font-semibold text-success">Mốc đã được cập nhật</p> : null}{journey.milestones.map((milestone) => { const waiting = deriveWaitingView(milestone); return <article key={milestone.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Mốc {milestone.sequence}</p><h3 className="mt-1 font-bold text-text">{milestone.name}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><StatusLabel tone={statusTone[milestone.status]}>{statusLabels[milestone.status]}</StatusLabel>{waiting ? <StatusLabel tone="warning">{waitingLabels[waiting]}</StatusLabel> : null}</div></div><div className="flex flex-wrap gap-2">{milestone.status !== 'COMPLETED' && milestone.status !== 'WAIVED' && <Button size="sm" variant="secondary" onClick={() => setEditingId(editingId === milestone.id ? undefined : milestone.id)}>{editingId === milestone.id ? 'Đóng cập nhật' : 'Cập nhật mốc'}</Button>}{canWaive && milestone.status !== 'COMPLETED' && milestone.status !== 'WAIVED' && <Button size="sm" variant="secondary" onClick={() => setWaiveMilestone(milestone)}>Miễn trừ</Button>}</div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-text-muted">Hạn xử lý</dt><dd className="font-semibold text-text">{milestone.dueAt ? new Date(milestone.dueAt).toLocaleDateString('vi-VN') : 'Không đặt hạn'}</dd></div><div><dt className="text-text-muted">Bằng chứng</dt><dd className="font-semibold text-text">{milestone.completedEvidenceCount}/{milestone.requiredEvidenceCount} tệp</dd></div><div><dt className="text-text-muted">Phụ trách</dt><dd className="font-semibold text-text">{milestone.owner.name}</dd></div></dl>{milestone.blockerReason ? <p className="mt-3 rounded-control bg-[#fff3dc] px-3 py-2 text-sm text-warning">{milestone.blockerReason}</p> : null}{milestone.waiverReason ? <p className="mt-3 rounded-control bg-[#fff3dc] px-3 py-2 text-sm text-warning">Miễn trừ: {milestone.waiverReason}</p> : null}{editingId === milestone.id ? <div className="mt-4"><MilestoneForm journey={journey} milestone={milestone} onCancel={() => setEditingId(undefined)} onSaved={() => { setEditingId(undefined); setSaved(true); }} /></div> : null}</article>; })}{waiveMilestone ? <WaiveMilestoneDialog journeyId={journey.id} milestone={waiveMilestone} open onClose={() => setWaiveMilestone(undefined)} onSaved={() => setSaved(true)} /> : null}</div>;
}
