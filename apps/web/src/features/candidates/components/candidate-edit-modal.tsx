'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useUpdateCandidate, type CandidateDetail } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export function CandidateEditModal({ candidate, open, onClose, onSaved }: { candidate: CandidateDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const updateCandidate = useUpdateCandidate();
  const [name, setName] = useState(candidate.name);
  const [industry, setIndustry] = useState(candidate.industryLabels[0] ?? '');
  const [occupation, setOccupation] = useState(candidate.occupation);
  const [japaneseLevel, setJapaneseLevel] = useState(candidate.japaneseLevel);
  const [email, setEmail] = useState(candidate.email ?? '');
  const [phone, setPhone] = useState(candidate.phone ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !industry || !occupation.trim()) return setError('Vui lòng nhập đủ họ tên, ngành nghề và nghề nghiệp chính');
    setError('');
    updateCandidate.mutate({ id: candidate.id, body: { name, industryLabels: [industry], occupation, japaneseLevel, email: email || null, phone: phone || null, address: candidate.address ?? null, source: candidate.source ?? 'Nhập thủ công', readinessStatus: candidate.readinessStatus, contactabilityStatus: candidate.contactabilityStatus, version: candidate.version } }, {
      onSuccess: onSaved,
      onError: (mutationError) => setError(mutationError.message)
    });
  };

  return <Modal open={open} onClose={onClose} title="Chỉnh sửa hồ sơ ứng viên" description={`${candidate.code} · cập nhật thông tin hồ sơ gốc và giữ nguyên lịch sử nghiệp vụ.`} size="lg" footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={updateCandidate.isPending}>{updateCandidate.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></>}>
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">Họ và tên<input aria-label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Ngành nghề<select aria-label="Ngành nghề" value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}><option>Điều dưỡng</option><option>Dịch vụ lưu trú</option><option>Công nghệ thông tin</option><option>Cơ khí chế tạo</option><option>Sản xuất</option><option>Dịch vụ</option></select></label>
        <label className="text-sm font-semibold text-text">Nghề nghiệp chính<input aria-label="Nghề nghiệp chính" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Tiếng Nhật<select aria-label="Tiếng Nhật" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option><option>Chưa xác định</option></select></label>
        <label className="text-sm font-semibold text-text">Email<input aria-label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Số điện thoại<input aria-label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
      </div>
    </div>
  </Modal>;
}
