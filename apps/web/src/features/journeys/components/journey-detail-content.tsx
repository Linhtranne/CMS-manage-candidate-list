'use client';

import { useEffect, useMemo, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useDetailTab } from '@/hooks/use-detail-tab';
import { useCreateWorkItem } from '@/features/work/services/work-queries';
import { MilestoneList } from './milestone-list';

type Journey = components['schemas']['SupplyJourneyDetail'];
type Evidence = components['schemas']['JourneyEvidence'];
type DetailTab = 'progress' | 'documents' | 'tasks' | 'email' | 'history';
type LocalTask = { id: string; title: string; dueAt: string | null; status: 'TODO' | 'DONE'; milestoneId?: string };
const tabs: Array<[DetailTab, string]> = [['progress', 'Tiến độ'], ['documents', 'Hồ sơ'], ['tasks', 'Công việc'], ['email', 'Email'], ['history', 'Lịch sử']];

function storageKey(journeyId: string, suffix: string) { return `cms-journey-${journeyId}-${suffix}`; }

export function JourneyDetailContent({ journey, compact = false }: { journey: Journey; compact?: boolean }) {
  const [tab, setTab] = useDetailTab<DetailTab>('progress');
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Array<{ id: string; text: string; createdAt: string }>>([]);
  const [evidence, setEvidence] = useState<Evidence[]>(journey.evidence);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const createWork = useCreateWorkItem();
  const currentUser = useCurrentUser();
  const canWaive = currentUser.data?.permissions.includes('journeys.waive') ?? false;
  const completed = journey.progress.completed;
  const percent = journey.progress.applicable ? Math.round((completed / journey.progress.applicable) * 100) : 0;
  const pendingMilestones = useMemo(() => journey.milestones.filter((milestone) => !['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(milestone.status)), [journey.milestones]);

  useEffect(() => {
    try {
      const savedNotes = window.localStorage.getItem(storageKey(journey.id, 'notes'));
      const savedEvidence = window.localStorage.getItem(storageKey(journey.id, 'evidence'));
      const savedTasks = window.localStorage.getItem(storageKey(journey.id, 'tasks'));
      if (savedNotes) setNotes(JSON.parse(savedNotes) as Array<{ id: string; text: string; createdAt: string }>);
      if (savedEvidence) setEvidence([...journey.evidence, ...(JSON.parse(savedEvidence) as Evidence[])]);
      if (savedTasks) setTasks(JSON.parse(savedTasks) as LocalTask[]);
    } catch {
      // Ignore malformed local demo state and render the server snapshot.
    } finally {
      setHydrated(true);
    }
  }, [journey.evidence, journey.id]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey(journey.id, 'notes'), JSON.stringify(notes));
    window.localStorage.setItem(storageKey(journey.id, 'evidence'), JSON.stringify(evidence.filter((item) => item.id.startsWith('local-'))));
    window.localStorage.setItem(storageKey(journey.id, 'tasks'), JSON.stringify(tasks));
  }, [evidence, hydrated, journey.id, notes, tasks]);

  const allTasks = useMemo<LocalTask[]>(() => [
    ...pendingMilestones.map((milestone) => ({ id: `milestone-task-${milestone.id}`, title: `Xử lý mốc: ${milestone.name}`, dueAt: milestone.dueAt, status: 'TODO' as const, milestoneId: milestone.id })),
    ...tasks
  ], [pendingMilestones, tasks]);

  const addTask = () => {
    if (!taskTitle.trim() || !taskDueAt) return;
    createWork.mutate({ title: taskTitle.trim(), priority: 'NORMAL', dueAt: new Date(taskDueAt).toISOString(), candidateId: journey.candidate.id, orderId: journey.order.id, clientId: journey.client.id, notes: `Lộ trình ${journey.id}` }, { onSuccess: (item) => { setTasks((current) => [...current, { id: item.id, title: taskTitle.trim(), dueAt: new Date(taskDueAt).toISOString(), status: 'TODO', milestoneId: journey.currentMilestone }]); setTaskTitle(''); setTaskDueAt(''); setTaskOpen(false); } });
  };

  const addEvidence = (file: File) => {
    setEvidence((current) => [...current, { id: `local-evidence-${Date.now()}`, milestoneId: journey.milestones[0]?.id ?? '', fileName: file.name, scanStatus: 'PENDING', uploadedAt: new Date().toISOString(), uploadedBy: currentUser.data ? { id: currentUser.data.id, name: currentUser.data.displayName } : { id: 'current-user', name: 'Bạn' }, downloadUrl: null }]);
  };

  return <div className="space-y-5">
    <header className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-accent">{journey.candidate.code}</p><h1 className={`${compact ? 'text-xl' : 'text-2xl'} mt-1 font-bold text-text`}>{journey.candidate.name}</h1><p className="mt-2 text-sm text-text-muted">{journey.order.code} · {journey.order.position} · {journey.client.name}</p></div><div className="flex flex-wrap items-center gap-2"><StatusLabel tone={journey.health === 'AT_RISK' ? 'danger' : journey.health === 'OVERDUE' ? 'warning' : journey.health === 'COMPLETED' ? 'neutral' : 'success'}>{journey.health === 'AT_RISK' ? 'Có rủi ro' : journey.health === 'OVERDUE' ? 'Quá hạn' : journey.health === 'COMPLETED' ? 'Đã hoàn tất' : 'Đúng tiến độ'}</StatusLabel><span className="text-sm text-text-muted">Phụ trách: {journey.owner.name}</span></div></div><div className="mt-5 grid gap-4 sm:grid-cols-4"><div><p className="text-xs uppercase tracking-wide text-text-muted">Mẫu lộ trình</p><p className="mt-1 font-semibold text-text">{journey.templateName}</p><p className="text-xs text-text-muted">Phiên bản {journey.templateVersion}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Mốc hiện tại</p><p className="mt-1 font-semibold text-text">{journey.currentMilestone}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Tiến độ</p><p className="mt-1 font-semibold text-text">{completed}/{journey.progress.applicable} mốc ({percent}%)</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Hạn gần nhất</p><p className="mt-1 font-semibold text-text">{journey.nearestDueAt ? new Date(journey.nearestDueAt).toLocaleDateString('vi-VN') : 'Không còn hạn'}</p></div></div></header>
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Các tab lộ trình">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 border-b-2 px-3 text-sm font-semibold ${tab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}>{label}</button>)}</nav>
    {tab === 'progress' ? <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-text">Các mốc cung ứng</h2><p className="mt-1 text-sm text-text-muted">Mốc được mở theo dependency; trạng thái chờ được suy ra từ bên đang chặn.</p></div><Button variant="secondary" size="sm" onClick={() => { setNote(''); setNoteOpen(true); }}>Thêm ghi chú</Button></div>{notes.length ? <section className="mb-4 rounded-lg border border-border bg-panel p-4"><h3 className="text-sm font-bold text-text">Ghi chú phiên làm việc</h3><ul className="mt-3 space-y-3">{notes.map((item) => <li key={item.id} className="border-l-2 border-accent pl-3"><p className="text-sm text-text">{item.text}</p><p className="mt-1 text-xs text-text-muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · {currentUser.data?.displayName ?? 'Bạn'}</p></li>)}</ul></section> : <p className="mb-4 rounded-lg border border-dashed border-border p-3 text-sm text-text-muted">Chưa có ghi chú. Ghi chú này chỉ dành cho nội bộ.</p>}<MilestoneList journey={journey} canWaive={canWaive} /></section> : null}
    {tab === 'documents' ? <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text">Hồ sơ và bằng chứng</h2><p className="mt-1 text-sm text-text-muted">Tệp mới sẽ ở trạng thái đang kiểm tra cho đến khi backend quét an toàn.</p></div><label className="inline-flex min-h-10 cursor-pointer items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]">Thêm tệp<input className="sr-only" type="file" name="journey-files" aria-label="Thêm tệp lộ trình" onChange={(event) => { const file = event.target.files?.[0]; if (file) addEvidence(file); event.currentTarget.value = ''; }} /></label></div>{evidence.length ? <ul className="mt-4 divide-y divide-border">{evidence.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-text">{item.fileName}</p><p className="text-xs text-text-muted">Tải lên bởi {item.uploadedBy.name} · {new Date(item.uploadedAt).toLocaleString('vi-VN')}</p></div><div className="flex items-center gap-3"><StatusLabel tone={item.scanStatus === 'SAFE' ? 'success' : item.scanStatus === 'QUARANTINED' || item.scanStatus === 'REJECTED' ? 'danger' : 'warning'}>{item.scanStatus === 'SAFE' ? 'Đã quét an toàn' : item.scanStatus === 'QUARANTINED' ? 'Bị cách ly' : item.scanStatus === 'REJECTED' ? 'Từ chối' : 'Đang kiểm tra'}</StatusLabel>{item.downloadUrl ? <a href={item.downloadUrl} className="text-sm font-semibold text-accent underline">Tải xuống</a> : <span className="text-xs text-text-muted">Chờ lưu tệp</span>}</div></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">Chưa có bằng chứng. Thêm tệp để gắn vào lộ trình.</p>}</section> : null}
    {tab === 'tasks' ? <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-text">Công việc liên quan</h2><p className="mt-1 text-sm text-text-muted">Task được suy ra từ mốc đang mở và có thể bổ sung thủ công.</p></div><Button variant="primary" size="sm" onClick={() => setTaskOpen(true)}>Thêm công việc</Button></div>{allTasks.length ? <ul className="mt-4 space-y-3">{allTasks.map((task) => <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"><label className="flex items-start gap-3"><input type="checkbox" name={`journey-task-${task.id}`} aria-label={`Đánh dấu ${task.title} hoàn tất`} checked={task.status === 'DONE'} onChange={() => { if (task.id.startsWith('local-')) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: item.status === 'DONE' ? 'TODO' : 'DONE' } : item)); }} disabled={!task.id.startsWith('local-')} className="mt-1 size-4 accent-[#2865ad]" /><span><span className={`font-semibold ${task.status === 'DONE' ? 'text-text-muted line-through' : 'text-text'}`}>{task.title}</span>{task.dueAt ? <span className="mt-1 block text-xs text-text-muted">Hạn {new Date(task.dueAt).toLocaleString('vi-VN')}</span> : null}</span></label><StatusLabel tone={task.status === 'DONE' ? 'success' : 'warning'}>{task.status === 'DONE' ? 'Đã hoàn thành' : 'Cần xử lý'}</StatusLabel></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-text-muted">Chưa có công việc mở cho lộ trình này.</p>}</section> : null}
    {tab === 'email' ? <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Email liên quan</h2><p className="mt-3 text-sm text-text-muted">Mở hộp thư chung để xem toàn bộ chuỗi trao đổi đã liên kết với ứng viên.</p><a className="mt-4 inline-flex min-h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-accent" href={`/mailbox?journeyId=${journey.id}`}>Mở hộp thư chung</a></section> : null}
    {tab === 'history' ? <section className="rounded-lg border border-border bg-panel p-5"><h2 className="font-bold text-text">Lịch sử thay đổi</h2><ol className="mt-4 space-y-4">{journey.history.map((event) => <li key={event.id} className="border-l-2 border-accent pl-4"><p className="text-sm font-semibold text-text">{event.summary}</p><p className="mt-1 text-xs text-text-muted">{new Date(event.occurredAt).toLocaleString('vi-VN')} · {event.actor.name}</p></li>)}</ol></section> : null}
    <Modal open={noteOpen} title="Thêm ghi chú lộ trình" description="Ghi chú nội bộ sẽ được lưu trên trình duyệt demo." onClose={() => setNoteOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={() => setNoteOpen(false)}>Hủy</Button><Button variant="primary" disabled={!note.trim()} onClick={() => { setNotes((current) => [...current, { id: `note-${Date.now()}`, text: note.trim(), createdAt: new Date().toISOString() }]); setNoteOpen(false); }}>Lưu ghi chú</Button></>}><label className="block text-sm font-semibold text-text">Nội dung ghi chú<textarea aria-label="Nội dung ghi chú lộ trình" name="noi-dung-ghi-chu-lo-trinh" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-32 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></Modal>
    <Modal open={taskOpen} title="Thêm công việc lộ trình" description="Task sẽ được liên kết với ứng viên, đơn tuyển và khách hàng trong hàng đợi nội bộ." onClose={() => setTaskOpen(false)} size="sm" footer={<><Button variant="secondary" onClick={() => setTaskOpen(false)}>Hủy</Button><Button variant="primary" disabled={createWork.isPending || !taskTitle.trim() || !taskDueAt} onClick={addTask}>{createWork.isPending ? 'Đang tạo…' : 'Thêm công việc'}</Button></>}><div className="space-y-4">{createWork.error ? <p role="alert" className="text-sm font-semibold text-danger">{createWork.error instanceof Error ? createWork.error.message : 'Không thể tạo công việc.'}</p> : null}<label className="block text-sm font-semibold text-text">Tên công việc<input aria-label="Tên công việc" name="ten-cong-viec" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Ví dụ: Xác nhận giấy phép lao động" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">Hạn xử lý<input aria-label="Hạn xử lý" name="han-xu-ly" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label></div></Modal>
  </div>;
}
