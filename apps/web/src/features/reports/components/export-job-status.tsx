import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';

type ReportExportJob = components['schemas']['ReportExportJob'];

export function ExportJobStatus({ job }: { job: ReportExportJob }) {
  if (job.status === 'COMPLETED' && job.downloadUrl) return <div className="rounded-lg border border-[#b9dec9] bg-[#f5fcf7] p-4"><StatusLabel tone="success">Đã tạo tệp</StatusLabel><p className="mt-2 text-sm text-text-muted">Liên kết hết hạn lúc {job.expiresAt ? new Date(job.expiresAt).toLocaleString('vi-VN') : 'không xác định'}.</p><a className="mt-3 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-white hover:bg-[#1e4e8d]" href={job.downloadUrl}>Tải tệp {job.format}</a></div>;
  if (job.status === 'FAILED') return <div className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-4 text-sm text-danger">{job.error ?? 'Không thể tạo tệp.'}</div>;
  if (job.status === 'EXPIRED') return <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">Liên kết xuất đã hết hạn. Hãy tạo yêu cầu mới.</div>;
  return <div className="rounded-lg border border-border bg-surface p-4"><StatusLabel tone="info">{job.status === 'QUEUED' ? 'Đang chờ xử lý' : 'Đang tạo tệp'}</StatusLabel><p className="mt-2 text-sm text-text-muted">Yêu cầu đã được ghi audit; không khóa màn hình báo cáo.</p></div>;
}
