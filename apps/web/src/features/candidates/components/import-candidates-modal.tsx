'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCandidates, useImportCandidates } from '../services/candidate-queries';

type PreviewRow = { row: number; values: Record<string, string>; error?: string; duplicate?: boolean };
const requiredHeaders = ['name', 'industry'];

function parseCsv(text: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = (lines[0] ?? '').split(',').map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').reduce<Record<string, string>>((acc, value, columnIndex) => { const header = headers[columnIndex]; if (header) acc[header] = value.trim(); return acc; }, {});
    if (!values.occupation) values.occupation = 'Chưa cập nhật';
    const missing = requiredHeaders.filter((header) => !values[header]);
    return { row: index + 2, values, error: missing.length ? `Thiếu ${missing.join(', ')}` : undefined };
  });
}

export function ImportCandidatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importCandidates = useImportCandidates();
  const existing = useCandidates({ view: 'all' });
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<{ validRows: number; invalidRows: number; duplicateRows: number } | null>(null);
  const [error, setError] = useState('');
  const validRows = rows.filter((row) => !row.error && !row.duplicate).length;

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile); setResult(null); setError(''); setRows([]);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setError('Bản xem trước hiện hỗ trợ CSV. Với Excel, hãy lưu thành CSV để kiểm tra mapping trước khi import.');
      return;
    }
    const parsed = parseCsv(await nextFile.text());
    const candidates = existing.data?.items ?? [];
    setRows(parsed.map((row) => {
      const name = row.values.name?.toLowerCase();
      const duplicate = Boolean(name && candidates.some((candidate) => candidate.name.toLowerCase() === name));
      return { ...row, duplicate };
    }));
  };

  const submit = () => {
    if (!file || !rows.length) return setError('Vui lòng chọn tệp CSV có ít nhất một dòng dữ liệu hợp lệ.');
    setError('');
    importCandidates.mutate({ fileName: file.name, rows: rows.filter((row) => !row.error && !row.duplicate).map((row) => row.values), version: 0 }, {
      onSuccess: (response) => setResult({ validRows: response.validRows, invalidRows: response.invalidRows, duplicateRows: response.duplicateRows }),
      onError: (mutationError) => setError(mutationError.message)
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Import ứng viên" description="Tải bảng tính lên, xem trước cảnh báo rồi mới ghi nhận vào danh sách hồ sơ gốc." size="md" footer={result ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={!file || importCandidates.isPending}>{importCandidates.isPending ? 'Đang kiểm tra…' : 'Xác nhận import'}</Button></>}>
      {result ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status"><p>Đã import {result.validRows} hồ sơ ứng viên</p><p className="mt-1 text-xs font-normal text-text-muted">{result.invalidRows} dòng lỗi · {result.duplicateRows} dòng trùng</p></div> : <div className="space-y-5">
        {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
        <label className="block text-sm font-semibold text-text">Tệp ứng viên<input aria-label="Tệp ứng viên" name="tep-ung-vien" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { void selectFile(event.target.files?.[0] ?? null); }} className="mt-2 block w-full rounded-control border border-border bg-panel px-3 py-3 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold" /></label>
        <div className="rounded-control border border-border bg-surface p-4 text-sm">
          <p className="font-semibold text-text">Kiểm tra trước khi import</p>
          {file ? <div className="mt-3 space-y-3 text-text-muted"><p><span className="font-semibold text-success">{validRows} dòng hợp lệ</span> · {rows.filter((row) => row.error).length} dòng lỗi · {rows.filter((row) => row.duplicate).length} dòng nghi trùng</p><p>Tệp: {file.name}</p>{rows.length ? <div className="max-h-48 overflow-auto rounded-control border border-border"><table className="w-full text-left text-xs"><thead className="border-b border-border"><tr><th className="px-2 py-2">Dòng</th><th className="px-2 py-2">Họ tên</th><th className="px-2 py-2">Trạng thái</th></tr></thead><tbody>{rows.slice(0, 8).map((row) => <tr key={row.row} className="border-b border-border last:border-0"><td className="px-2 py-2">{row.row}</td><td className="px-2 py-2">{row.values.name || '—'}</td><td className="px-2 py-2">{row.error ? <span className="text-danger">{row.error}</span> : row.duplicate ? <span className="text-warning">Nghi trùng</span> : <span className="text-success">Hợp lệ</span>}</td></tr>)}</tbody></table></div> : <p>Không đọc được dòng dữ liệu. Kiểm tra hàng tiêu đề: name, industry, occupation.</p>}</div> : <p className="mt-2 text-text-muted">Chọn tệp CSV để xem mapping và cảnh báo trước khi import.</p>}
        </div>
      </div>}
    </Modal>
  );
}
