'use client';

import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { normalizeReportFilters, type ReportFilters } from '../domain/report-filters';
import { useReportFunnel, useReportSummary } from '../services/report-queries';
import { ExportReportDialog } from './export-report-dialog';
import { FunnelTable } from './funnel-table';
import { ReportFilterBar } from './report-filter-bar';
import { ReportSection } from './report-section';

export function ReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => normalizeReportFilters(typeof window === 'undefined' ? undefined : window.location.search));
  const [exportOpen, setExportOpen] = useState(false);
  const summaryQuery = useReportSummary(filters);
  const funnelQuery = useReportFunnel(filters);
  const updateFilters = (next: ReportFilters) => {
    const search = new URLSearchParams(Object.entries(next).filter(([, value]) => Boolean(value)) as [string, string][]);
    window.history.replaceState({}, '', `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ''}`);
    setFilters(next);
  };
  const summary = summaryQuery.data;
  const asOf = useMemo(() => summary?.asOf ? new Date(summary.asOf).toLocaleString('vi-VN') : '', [summary?.asOf]);
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Quản trị vận hành</p><h1 className="mt-1 text-2xl font-bold text-text">Báo cáo</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Theo dõi phễu tuyển dụng, chất lượng nguồn, hiệu suất cung ứng và SLA hộp thư chung.</p></div></div><ReportFilterBar filters={filters} onChange={updateFilters} onExport={() => setExportOpen(true)} />{summaryQuery.isPending || funnelQuery.isPending ? <LoadingState label="Đang tổng hợp báo cáo" /> : summaryQuery.error || funnelQuery.error ? <ErrorState message="Không thể tải báo cáo theo bộ lọc hiện tại." onRetry={() => { void summaryQuery.refetch(); void funnelQuery.refetch(); }} /> : summary && funnelQuery.data ? <><div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted">Dữ liệu cập nhật lúc <strong className="text-text">{asOf}</strong> · Múi giờ {summary.filters.timeZone}</div><FunnelTable stages={funnelQuery.data.stages} /><ReportSection title="Tổng quan tuyển dụng" description="Candidate và Application dùng hai mẫu số khác nhau để tránh đọc sai tỷ lệ." metrics={summary.metrics} /><div className="grid gap-6 xl:grid-cols-2"><ReportSection title="Chất lượng nguồn" description="Tỷ lệ trúng tuyển theo nguồn trong khoảng thời gian đã chọn." metrics={summary.sourceQuality} /><ReportSection title="Khách hàng và đơn tuyển" description="Theo dõi số đơn đang tuyển và đã đủ người." metrics={summary.clients} /><ReportSection title="Lộ trình cung ứng" description="Từ trúng tuyển đến hoàn tất cung ứng nhân sự sang Nhật." metrics={summary.journeys} /><ReportSection title="Hộp thư chung và SLA" description="Đo phản hồi chính danh, email chưa ghép và khối lượng xử lý." metrics={summary.mailbox} /><ReportSection title="Khối lượng công việc" description="Điểm nghẽn cần xử lý trong ngày của đội nội bộ." metrics={summary.workload} /><ReportSection title="Chất lượng dữ liệu" description="Các trường hợp cần làm sạch trước khi tự động hóa." metrics={summary.dataQuality} /></div></> : null}<ExportReportDialog open={exportOpen} filters={filters} onClose={() => setExportOpen(false)} /></div>;
}
