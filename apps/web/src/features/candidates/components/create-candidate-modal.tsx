'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateCandidate, type Candidate } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export function CreateCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCandidate = useCreateCandidate();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [occupation, setOccupation] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('N4');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Nhập thủ công');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Candidate | null>(null);

  const submit = () => {
    if (!name.trim()) return setError('Vui lòng nhập họ tên');
    if (!industry) return setError('Vui lòng chọn ngành nghề');
    if (!occupation.trim()) return setError('Vui lòng nhập nghề nghiệp chính');
    setError('');
    createCandidate.mutate({ name, industryLabels: [industry], occupation, japaneseLevel, email: email || null, phone: phone || null, source, version: 0 }, {
      onSuccess: (candidate) => setSaved(candidate),
      onError: (mutationError) => setError(mutationError.message)
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Thêm ứng viên" description="Tạo hồ sơ gốc một lần để dùng xuyên suốt các đơn tuyển và lộ trình cung ứng." size="lg" footer={saved ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={createCandidate.isPending}>{createCandidate.isPending ? 'Đang lưu...' : 'Lưu ứng viên'}</Button></>}>
      {saved ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">Đã tạo hồ sơ ứng viên {saved.code}</div> : <div className="space-y-5">
        {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-text sm:col-span-2">Họ và tên<input aria-label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} autoComplete="name" /></label>
          <label className="text-sm font-semibold text-text">Ngành nghề<select aria-label="Ngành nghề" value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}><option value="">Chọn ngành nghề</option><option>Điều dưỡng</option><option>Dịch vụ lưu trú</option><option>Công nghệ thông tin</option><option>Cơ khí chế tạo</option><option>Sản xuất</option><option>Dịch vụ</option></select></label>
          <label className="text-sm font-semibold text-text">Nghề nghiệp chính<input aria-label="Nghề nghiệp chính" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
          <label className="text-sm font-semibold text-text">Trình độ tiếng Nhật<select aria-label="Trình độ tiếng Nhật" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option><option>Chưa xác định</option></select></label>
          <label className="text-sm font-semibold text-text">Nguồn hồ sơ<select aria-label="Nguồn hồ sơ" value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}><option>Nhập thủ công</option><option>Giới thiệu nội bộ</option><option>Import bảng tính</option><option>Đối tác tuyển dụng</option><option>Ứng tuyển trực tiếp</option></select></label>
          <label className="text-sm font-semibold text-text">Email<input aria-label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
          <label className="text-sm font-semibold text-text">Số điện thoại<input aria-label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} inputMode="tel" /></label>
        </div>
        <p className="text-xs text-text-muted">Các trường bắt buộc giúp đội tuyển dụng bắt đầu sàng lọc mà không tạo hồ sơ trùng.</p>
      </div>}
    </Modal>
  );
}
