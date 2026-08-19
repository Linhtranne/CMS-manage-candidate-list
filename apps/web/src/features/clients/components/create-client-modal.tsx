'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateClient } from '../services/client-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';
const errorId = 'create-client-error';

export function CreateClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useCreateClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLSelectElement>(null);
  const regionRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('Doanh nghiệp tiếp nhận');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'name' | 'industry' | 'region' | null>(null);
  const [savedCode, setSavedCode] = useState('');

  useEffect(() => {
    if (open) return;
    setName(''); setOrganizationType('Doanh nghiệp tiếp nhận'); setIndustry(''); setRegion(''); setContactName(''); setNotes(''); setError(''); setErrorField(null); setSavedCode('');
  }, [open]);

  const submit = () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên khách hàng.'); setErrorField('name');
      return requestAnimationFrame(() => nameRef.current?.focus());
    }
    if (!industry) {
      setError('Vui lòng chọn ít nhất một ngành.'); setErrorField('industry');
      return requestAnimationFrame(() => industryRef.current?.focus());
    }
    if (!region.trim()) {
      setError('Vui lòng nhập khu vực tiếp nhận.'); setErrorField('region');
      return requestAnimationFrame(() => regionRef.current?.focus());
    }
    setError('');
    setErrorField(null);
    mutation.mutate({ name: name.trim(), organizationType, industryLabels: [industry], region: region.trim(), ownerId: 'u-recruiter', contactName: contactName.trim() || null, notes: notes.trim() || null }, {
      onSuccess: (client) => setSavedCode(client.code),
      onError: (cause) => setError(cause.message)
    });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedCode && Boolean(name.trim() || industry || region.trim() || contactName.trim() || notes.trim())} title="Thêm khách hàng" description="Tạo ngữ cảnh tiếp nhận nhân sự đa ngành để dùng cho các đơn tuyển." size="lg" footer={savedCode ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu khách hàng'}</Button></>}>
    {savedCode ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Đã tạo khách hàng {savedCode}.</p> : <div className="space-y-5">
      {error ? <p id={errorId} role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">Tên khách hàng<input ref={nameRef} aria-label="Tên khách hàng" aria-invalid={errorField === 'name'} aria-describedby={errorField === 'name' ? errorId : undefined} name="ten-khach-hang" value={name} onChange={(event) => { setName(event.target.value); setErrorField(null); }} className={inputClass} autoComplete="organization" /></label>
        <label className="text-sm font-semibold text-text">Loại tổ chức<select aria-label="Loại tổ chức" name="loai-to-chuc" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className={inputClass}><option>Doanh nghiệp tiếp nhận</option><option>Nghiệp đoàn / tổ chức giám sát</option><option>Đối tác tuyển dụng</option><option>Đơn vị đào tạo</option></select></label>
        <label className="text-sm font-semibold text-text">Ngành chính<select ref={industryRef} aria-label="Ngành chính" aria-invalid={errorField === 'industry'} aria-describedby={errorField === 'industry' ? errorId : undefined} name="nganh-chinh" value={industry} onChange={(event) => { setIndustry(event.target.value); setErrorField(null); }} className={inputClass}><option value="">Chọn ngành</option><option>Công nghệ thông tin</option><option>Điều dưỡng</option><option>Cơ khí</option><option>Sản xuất</option><option>Dịch vụ lưu trú</option></select></label>
        <label className="text-sm font-semibold text-text">Khu vực tại Nhật<input ref={regionRef} aria-label="Khu vực tại Nhật" aria-invalid={errorField === 'region'} aria-describedby={errorField === 'region' ? errorId : undefined} name="khu-vuc-tai-nhat" value={region} onChange={(event) => { setRegion(event.target.value); setErrorField(null); }} className={inputClass} placeholder="Tokyo, Osaka…" autoComplete="off" /></label>
        <label className="text-sm font-semibold text-text">Đầu mối chính<input aria-label="Đầu mối chính" name="dau-moi-chinh" value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text sm:col-span-2">Ghi chú vận hành<textarea aria-label="Ghi chú vận hành" name="ghi-chu-van-hanh" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24 py-2`} /></label>
      </div>
    </div>}
  </Modal>;
}
