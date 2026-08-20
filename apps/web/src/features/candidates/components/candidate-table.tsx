import type { ColumnDef } from '@tanstack/react-table';
import type { components } from '@cms/contracts';
import { CmsDataTable } from '@/components/ui/cms-data-table';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import type { Translate } from '@/i18n/types';
import { catalogLabel, occupationLabel } from '@/i18n/catalog-options';
import { getDomainLabel } from '@/i18n/domain-labels';

type Candidate = components['schemas']['Candidate'];
type Phase = Candidate['operationalPhase'];

const phaseKeys = { POTENTIAL: 'candidates.table.phasePotential', APPLYING: 'candidates.table.phaseApplying', PASSED: 'candidates.table.phasePassed', SUPPLYING: 'candidates.table.phaseSupplying', SUPPLIED: 'candidates.table.phaseSupplied' } as const;

const phaseTones: Record<Phase, 'neutral' | 'info' | 'success' | 'warning'> = {
  POTENTIAL: 'neutral',
  APPLYING: 'info',
  PASSED: 'success',
  SUPPLYING: 'warning',
  SUPPLIED: 'success'
};

const readinessKeys = { NOT_READY: 'candidates.table.readinessNotReady', READY_FOR_REVIEW: 'candidates.table.readinessReview', READY_FOR_INTERVIEW: 'candidates.table.readinessInterview' } as const;

const contactabilityKeys = { CONTACTABLE: 'candidates.table.contactable', DO_NOT_CONTACT: 'candidates.table.doNotContact', UNKNOWN: 'candidates.table.contactUnknown' } as const;

export function candidatePhaseLabel(phase: Phase) {
  return phaseKeys[phase];
}

function candidateColumns(t: Translate, formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string): ColumnDef<Candidate>[] {
  return [
    { accessorKey: 'code', header: t('candidates.table.code'), cell: ({ row }) => <span className="font-semibold">{row.original.code}</span> },
    { accessorKey: 'name', header: t('candidates.table.candidate'), cell: ({ row }) => <div><p className="font-semibold">{row.original.name}</p><p className="text-xs text-text-muted">{row.original.emailMasked ?? t('candidates.table.noEmail')} · {row.original.phoneMasked ?? t('candidates.table.noPhone')}</p></div> },
    { accessorKey: 'industryLabels', header: t('candidates.table.industry'), cell: ({ row }) => <div><p>{row.original.industryLabels.map((value) => catalogLabel(t, value)).join(', ')}</p><p className="text-xs text-text-muted">{occupationLabel(t, row.original.occupation)}</p></div> },
    { accessorKey: 'japaneseLevel', header: t('candidates.table.japanese'), cell: ({ row }) => catalogLabel(t, row.original.japaneseLevel) },
    { id: 'phase', header: t('candidates.table.phase'), cell: ({ row }) => <StatusLabel tone={phaseTones[row.original.operationalPhase]}>{t(phaseKeys[row.original.operationalPhase])}</StatusLabel> },
    { id: 'readiness', header: t('candidates.table.readiness'), cell: ({ row }) => t(readinessKeys[row.original.readinessStatus]) },
    { id: 'contactability', header: t('candidates.table.contactability'), cell: ({ row }) => <StatusLabel tone={row.original.contactabilityStatus === 'CONTACTABLE' ? 'success' : row.original.contactabilityStatus === 'UNKNOWN' ? 'warning' : 'neutral'}>{t(contactabilityKeys[row.original.contactabilityStatus])}</StatusLabel> },
    { accessorKey: 'nextAction', header: t('candidates.table.nextAction'), cell: ({ row }) => <span className="font-semibold text-accent">{getDomainLabel(t, 'candidateNextAction', row.original.nextAction)}</span> },
    { accessorKey: 'owner.name', header: t('candidates.table.owner'), cell: ({ row }) => row.original.owner.name },
    { accessorKey: 'lastActivityAt', header: t('candidates.table.lastActivity'), cell: ({ row }) => <span className="text-xs text-text-muted">{formatDate(row.original.lastActivityAt, { dateStyle: 'short' })}</span> }
  ];
}

export function CandidateTable({ candidates, isLoading, error, onRetry, onRowClick }: { candidates: Candidate[]; isLoading?: boolean; error?: string; onRetry?: () => void; onRowClick: (candidate: Candidate) => void }) {
  const { t, formatDate } = useI18n();
  return <CmsDataTable data={candidates} columns={candidateColumns(t, formatDate)} isLoading={isLoading} error={error} onRetry={onRetry} emptyTitle={t('candidates.list.empty')} getRowId={(row) => row.id} onRowClick={onRowClick} />;
}
