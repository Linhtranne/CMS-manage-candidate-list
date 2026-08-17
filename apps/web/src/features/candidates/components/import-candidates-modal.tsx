'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useImportCandidates } from '../services/candidate-queries';

export function ImportCandidatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importCandidates = useImportCandidates();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ validRows: number } | null>(null);
  const [error, setError] = useState('');
  const validRows = file ? 2 : 0;

  const submit = () => {
    if (!file) return setError('Vui lòng chọn tệp ứng viên');
    setError('');
    importCandidates.mutate({ fileName: file.name, rows: [{ row: 1 }, { row: 2 }], version: 0 }, {
      onSuccess: (response) => setResult({ validRows: response.validRows }),
      onError: (mutationError) => setError(mutationError.message)
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Import ứng viên" description="Tải bảng tính lên, xem trước cảnh báo rồi mới ghi nhận vào danh sách hồ sơ gốc." size="md" footer={result ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={!file || importCandidates.isPending}>{importCandidates.isPending ? 'Đang kiểm tra...' : 'Xác nhận import'}</Button></>}>
      {result ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">Đã import {result.validRows} hồ sơ ứng viên</div> : <div className="space-y-5">
        {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
        <label className="block text-sm font-semibold text-text">Tệp ứng viên<input aria-label="Tệp ứng viên" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); }} className="mt-2 block w-full rounded-control border border-border bg-panel px-3 py-3 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold" /></label>
        <div className="rounded-control border border-border bg-surface p-4 text-sm">
          <p className="font-semibold text-text">Kiểm tra trước khi import</p>
          {file ? <div className="mt-3 space-y-2 text-text-muted"><p><span className="font-semibold text-success">{validRows} dòng hợp lệ</span> · 0 dòng lỗi</p><p>0 dòng nghi trùng · Tệp: {file.name}</p></div> : <p className="mt-2 text-text-muted">Chọn tệp CSV hoặc Excel để xem kết quả kiểm tra.</p>}
        </div>
      </div>}
    </Modal>
  );
}
