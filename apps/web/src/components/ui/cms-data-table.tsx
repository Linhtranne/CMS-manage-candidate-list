import type { ColumnDef } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export function CmsDataTable<TData>({
  data,
  columns,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = 'Chưa có dữ liệu',
  getRowId,
  onRowClick
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getRowId });
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data.length) return <EmptyState title={emptyTitle} description="Hãy điều chỉnh bộ lọc hoặc thêm bản ghi mới." />;

  return (
    <div className="cms-content-enter overflow-x-auto rounded-lg border border-border bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted">
          {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="px-4 py-3 font-semibold">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row.original)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRowClick?.(row.original); } }} className={onRowClick ? 'cursor-pointer border-b border-border last:border-0 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent' : 'border-b border-border last:border-0'}>
              {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3 text-text">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
