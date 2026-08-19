'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { useClients } from '@/features/clients/services/client-queries';
import { useCreateOrder } from '../services/order-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const positionRef = useRef<HTMLInputElement>(null);
  const clients = useClients();
  const mutation = useCreateOrder();
  const [position, setPosition] = useState('');
  const [clientId, setClientId] = useState('');
  const [industryLabel, setIndustryLabel] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [target, setTarget] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [salary, setSalary] = useState('');
  const [contractType, setContractType] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('N4');
  const [criteria, setCriteria] = useState('');
  const [error, setError] = useState('');
  const [savedCode, setSavedCode] = useState('');

  useEffect(() => {
    if (open) return;
    setPosition(''); setClientId(''); setIndustryLabel(''); setOccupation(''); setLocation(''); setTarget('1'); setDeadline(''); setSalary(''); setContractType(''); setJapaneseLevel('N4'); setCriteria(''); setError(''); setSavedCode('');
  }, [open]);

  const submit = () => {
    const targetValue = Number(target);
    if (!position.trim() || !clientId || !industryLabel || !occupation.trim() || !location.trim() || !deadline || !Number.isInteger(targetValue) || targetValue < 1) {
      setError('Vui lòng điền đủ các trường bắt buộc.');
      requestAnimationFrame(() => positionRef.current?.focus());
      return;
    }
    setError('');
    mutation.mutate({ position: position.trim(), clientId, industryLabel, occupation: occupation.trim(), location: location.trim(), target: targetValue, deadline: new Date(`${deadline}T00:00:00.000Z`).toISOString(), ownerId: 'u-recruiter', salary: salary.trim(), contractType: contractType.trim(), japaneseLevel, criteria: criteria.split(',').map((value) => value.trim()).filter(Boolean) }, {
      onSuccess: (order) => setSavedCode(order.code),
      onError: (cause) => setError(cause.message)
    });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedCode && Boolean(position.trim() || clientId || industryLabel || occupation.trim() || location.trim() || deadline || salary.trim() || contractType.trim() || criteria.trim())} title="Tạo đơn tuyển" description="Khai báo nhu cầu tuyển dụng theo ngành, nghề và tuyến cung ứng." size="lg" footer={savedCode ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu…' : 'Lưu đơn tuyển'}</Button></>}>
    {savedCode ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Đã tạo đơn {savedCode} ở trạng thái Nháp.</p> : clients.isPending ? <LoadingState label="Đang tải danh sách khách hàng" /> : <div className="space-y-5">
      {error ? <p id="create-order-error" role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">Vị trí tuyển<input ref={positionRef} aria-label="Vị trí tuyển" aria-invalid={Boolean(error && !position.trim())} aria-describedby={error && !position.trim() ? 'create-order-error' : undefined} name="order-position" autoComplete="off" value={position} onChange={(event) => { setPosition(event.target.value); setError(''); }} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Khách hàng<select aria-label="Khách hàng của đơn tuyển" name="order-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}><option value="">Chọn khách hàng</option>{clients.data?.items.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">Ngành nghề<select aria-label="Ngành nghề của đơn tuyển" name="order-industry" value={industryLabel} onChange={(event) => setIndustryLabel(event.target.value)} className={inputClass}><option value="">Chọn ngành</option><option>Công nghệ thông tin</option><option>Cơ khí</option><option>Điều dưỡng</option><option>Sản xuất</option><option>Dịch vụ lưu trú</option></select></label>
        <label className="text-sm font-semibold text-text">Nghề tuyển<input aria-label="Nghề tuyển" name="order-occupation" autoComplete="off" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Địa điểm làm việc<input aria-label="Địa điểm làm việc" name="order-location" autoComplete="off" value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Chỉ tiêu<input aria-label="Chỉ tiêu tuyển" name="order-target" type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Hạn tuyển<input aria-label="Hạn tuyển" name="order-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Mức lương<input aria-label="Mức lương" name="order-salary" autoComplete="off" value={salary} onChange={(event) => setSalary(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Loại hợp đồng<input aria-label="Loại hợp đồng" name="order-contract-type" autoComplete="off" value={contractType} onChange={(event) => setContractType(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">Tiếng Nhật<select aria-label="Tiếng Nhật yêu cầu" name="order-japanese-level" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option><option>Chưa xác định</option></select></label>
        <label className="text-sm font-semibold text-text sm:col-span-2">Tiêu chí tuyển dụng<textarea aria-label="Tiêu chí tuyển dụng" name="order-criteria" value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder="Mỗi tiêu chí cách nhau bằng dấu phẩy" className={`${inputClass} min-h-20 py-2`} /></label>
      </div>
    </div>}
  </Modal>;
}
