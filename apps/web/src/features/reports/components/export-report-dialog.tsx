'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { ReportFilters } from '../domain/report-filters';
import { useCreateReportExport, useReportExportJob } from '../services/report-queries';
import { ExportJobStatus } from './export-job-status';

type ExportFormat = components['schemas']['CreateReportExportRequest']['format'];

export function ExportReportDialog({ open, filters, onClose }: { open: boolean; filters: ReportFilters; onClose: () => void }) {
  const mutation = useCreateReportExport();
  const [format, setFormat] = useState<ExportFormat>('XLSX');
  const [jobId, setJobId] = useState<string>();
  const jobQuery = useReportExportJob(jobId);
  useEffect(() => { if (!open) setJobId(undefined); }, [open]);
  const submit = async () => {
    const job = await mutation.mutateAsync({ reportKey: 'operational-summary', format, filters: { ...filters, timeZone: 'Asia/Ho_Chi_Minh' }, includedFields: ['metric', 'numerator', 'denominator', 'asOf'] });
    setJobId(job.id);
  };
  return <Modal open={open} onClose={onClose} title="Xuất báo cáo" description="Tạo tệp xuất nền và chỉ chứa trường trong phạm vi quyền." size="md" footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" disabled={mutation.isPending || Boolean(jobQuery.data)} onClick={() => void submit()}>{mutation.isPending ? 'Đang xếp hàng' : 'Tạo tệp xuất'}</Button></>}>
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Báo cáo vận hành</p>
      <label className="block text-sm font-semibold text-text">Định dạng<select aria-label="Định dạng tệp" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="XLSX">Excel (.xlsx)</option><option value="CSV">CSV (.csv)</option></select></label>
      {jobQuery.data ? <ExportJobStatus job={jobQuery.data} /> : mutation.isError ? <div role="alert" className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-4 text-sm text-danger">{mutation.error instanceof Error ? mutation.error.message : 'Không thể tạo tệp.'}</div> : <p className="rounded-lg bg-surface p-4 text-sm text-text-muted">Bộ lọc hiện tại sẽ được ghi vào audit cùng yêu cầu xuất.</p>}
    </div>
  </Modal>;
}
