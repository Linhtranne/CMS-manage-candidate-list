import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';

type Candidate = components['schemas']['Candidate'];
type Phase = Candidate['operationalPhase'];

const phaseLabels: Record<Phase, string> = {
  POTENTIAL: 'Tiềm năng',
  APPLYING: 'Đang ứng tuyển',
  PASSED: 'Đã trúng tuyển',
  SUPPLYING: 'Đang cung ứng',
  SUPPLIED: 'Đã cung ứng'
};

const phaseTones: Record<Phase, 'neutral' | 'info' | 'success' | 'warning'> = {
  POTENTIAL: 'neutral',
  APPLYING: 'info',
  PASSED: 'success',
  SUPPLYING: 'warning',
  SUPPLIED: 'success'
};

const readinessLabels: Record<Candidate['readinessStatus'], string> = {
  NOT_READY: 'Chưa đủ hồ sơ',
  READY_FOR_REVIEW: 'Chờ rà soát',
  READY_FOR_INTERVIEW: 'Sẵn sàng phỏng vấn'
};

const contactabilityLabels: Record<Candidate['contactabilityStatus'], string> = {
  CONTACTABLE: 'Có thể liên hệ',
  DO_NOT_CONTACT: 'Không liên hệ',
  UNKNOWN: 'Chưa xác minh'
};

export function candidatePhaseLabel(phase: Phase) {
  return phaseLabels[phase];
}

const columns: ColumnDef<Candidate>[] = [
  { accessorKey: 'code', header: 'Mã', cell: ({ row }) => <span className="font-semibold">{row.original.code}</span> },
  { accessorKey: 'name', header: 'Ứng viên', cell: ({ row }) => <div><p className="font-semibold">{row.original.name}</p><p className="text-xs text-text-muted">{row.original.emailMasked ?? 'Chưa có email'} · {row.original.phoneMasked ?? 'Chưa có số điện thoại'}</p></div> },
  { accessorKey: 'industryLabels', header: 'Ngành / nghề', cell: ({ row }) => <div><p>{row.original.industryLabels.join(', ')}</p><p className="text-xs text-text-muted">{row.original.occupation}</p></div> },
  { accessorKey: 'japaneseLevel', header: 'Tiếng Nhật' },
  { id: 'phase', header: 'Giai đoạn', cell: ({ row }) => <StatusLabel tone={phaseTones[row.original.operationalPhase]}>{phaseLabels[row.original.operationalPhase]}</StatusLabel> },
  { id: 'readiness', header: 'Sẵn sàng', cell: ({ row }) => readinessLabels[row.original.readinessStatus] },
  { id: 'contactability', header: 'Liên hệ', cell: ({ row }) => <StatusLabel tone={row.original.contactabilityStatus === 'CONTACTABLE' ? 'success' : row.original.contactabilityStatus === 'UNKNOWN' ? 'warning' : 'neutral'}>{contactabilityLabels[row.original.contactabilityStatus]}</StatusLabel> },
  { accessorKey: 'nextAction', header: 'Việc tiếp theo', cell: ({ row }) => <span className="font-semibold text-accent">{row.original.nextAction}</span> },
  { accessorKey: 'owner.name', header: 'Phụ trách', cell: ({ row }) => row.original.owner.name },
  { accessorKey: 'lastActivityAt', header: 'Cập nhật cuối', cell: ({ row }) => <span className="text-xs text-text-muted">{new Date(row.original.lastActivityAt).toLocaleDateString('vi-VN')}</span> }
];

export function CandidateTable({ candidates, isLoading, error, onRetry, onRowClick }: { candidates: Candidate[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (candidate: Candidate) => void }) {
  return <CmsDataTable data={candidates} columns={columns} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle="Không có ứng viên phù hợp" getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
