'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Client } from '../services/client-types';
import { useUpdateClient } from '../services/client-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function ClientEditModal({ client, open, onClose, onSaved }: { client: Client; open: boolean; onClose: () => void; onSaved: () => void }) {
  const mutation = useUpdateClient();
  const [name, setName] = useState(client.name);
  const [organizationType, setOrganizationType] = useState(client.organizationType);
  const [industry, setIndustry] = useState(client.industryLabels[0] ?? '');
  const [region, setRegion] = useState(client.region);
  const [contactName, setContactName] = useState(client.contactName ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [status, setStatus] = useState<Client['status']>(client.status);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !industry || !region.trim()) { setError('Vui lòng nhập đủ tên, ngành và khu vực.'); return; }
    setError('');
    mutation.mutate({ id: client.id, body: { name: name.trim(), organizationType, industryLabels: [industry], region: region.trim(), ownerId: client.owner.id, contactName: contactName.trim() || null, notes: notes.trim() || null, status, version: client.version } }, { onSuccess: onSaved, onError: (cause) => setError(cause.message) });
  };

  return <Modal open={open} onClose={onClose} title="Chỉnh sửa khách hàng" description="Cập nhật ngữ cảnh tiếp nhận nhân sự và lưu phiên bản thay đổi." size="lg" footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></>}>
    <div className="space-y-5">{error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-text sm:col-span-2">Tên khách hàng<input aria-label="Tên khách hàng" name="ten-khach-hang" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text">Loại tổ chức<select aria-label="Loại tổ chức" name="loai-to-chuc" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className={inputClass}><option>Doanh nghiệp tiếp nhận</option><option>Nghiệp đoàn / tổ chức giám sát</option><option>Đối tác tuyển dụng</option><option>Đơn vị đào tạo</option></select></label><label className="text-sm font-semibold text-text">Ngành chính<select aria-label="Ngành chính" name="nganh-chinh" value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}><option>Công nghệ thông tin</option><option>Điều dưỡng</option><option>Cơ khí</option><option>Sản xuất</option><option>Dịch vụ lưu trú</option></select></label><label className="text-sm font-semibold text-text">Khu vực tại Nhật<input aria-label="Khu vực tại Nhật" name="khu-vuc-tai-nhat" value={region} onChange={(event) => setRegion(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text">Trạng thái<select aria-label="Trạng thái khách hàng" name="trang-thai-khach-hang" value={status} onChange={(event) => setStatus(event.target.value as Client['status'])} className={inputClass}><option value="PROSPECT">Tiềm năng</option><option value="ACTIVE">Đang hợp tác</option><option value="PAUSED">Tạm dừng</option><option value="INACTIVE">Ngừng hợp tác</option></select></label><label className="text-sm font-semibold text-text">Đầu mối chính<input aria-label="Đầu mối chính" name="dau-moi-chinh" value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text sm:col-span-2">Ghi chú vận hành<textarea aria-label="Ghi chú vận hành" name="ghi-chu-van-hanh" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24 py-2`} /></label></div></div>
  </Modal>;
}
