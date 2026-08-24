import { SupplyJourneyDomainError, type JourneyMilestoneSnapshot, type MilestoneStatus } from './supply-journey.aggregate.js';

export type BlockerParty = 'CANDIDATE' | 'CLIENT_PARTNER' | 'INTERNAL' | 'OTHER';
export const BLOCKER_PARTIES = ['CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'OTHER'] as const;

export interface MilestoneTransitionInput {
  blockerParty?: BlockerParty;
  blockerReason?: string;
  expectedResolution?: string;
  reason?: string;
  checklistData?: Record<string, unknown>;
  evidenceIds?: string[];
  approvalId?: string;
  approverId?: string;
}

export interface MilestoneEvidenceResult { safe: boolean; count: number; requiredCount: number; ownerMatches: boolean }

export function dependenciesSatisfied(milestone: JourneyMilestoneSnapshot, all: readonly JourneyMilestoneSnapshot[]): boolean {
  const byCode = new Map(all.map((candidate) => [candidate.code, candidate]));
  return milestone.dependencyCodes.every((dependency) => {
    const predecessor = byCode.get(dependency);
    return Boolean(predecessor && ['COMPLETED', 'WAIVED', 'NOT_APPLICABLE'].includes(predecessor.status));
  });
}

export function assertMilestoneTransition(from: MilestoneStatus, to: MilestoneStatus, input: MilestoneTransitionInput, context: { canWaive?: boolean; canReopen?: boolean }): void {
  const allowed: Record<MilestoneStatus, readonly MilestoneStatus[]> = {
    NOT_STARTED: ['IN_PROGRESS', 'BLOCKED', 'NOT_APPLICABLE', 'WAIVED'],
    IN_PROGRESS: ['BLOCKED', 'COMPLETED', 'WAIVED'],
    BLOCKED: ['IN_PROGRESS', 'COMPLETED', 'WAIVED'],
    COMPLETED: context.canReopen ? ['IN_PROGRESS'] : [],
    WAIVED: [],
    NOT_APPLICABLE: [],
  };
  if (!allowed[from].includes(to)) throw new SupplyJourneyDomainError('INVALID_STATUS_TRANSITION', 409);
  if (to === 'BLOCKED' && (!input.blockerParty || !input.blockerReason?.trim() || !input.expectedResolution?.trim())) throw new SupplyJourneyDomainError('MILESTONE_BLOCK_REASON_REQUIRED');
  if (to === 'NOT_APPLICABLE' && !input.reason?.trim()) throw new SupplyJourneyDomainError('MILESTONE_NOT_APPLICABLE_REASON_REQUIRED');
  if (to === 'WAIVED' && (!context.canWaive || !input.reason?.trim() || !input.approvalId?.trim() || !input.approverId?.trim())) throw new SupplyJourneyDomainError('MILESTONE_WAIVER_APPROVAL_REQUIRED', 403);
  if (from === 'COMPLETED' && to === 'IN_PROGRESS' && (!context.canReopen || !input.approvalId?.trim() || !input.reason?.trim())) throw new SupplyJourneyDomainError('MILESTONE_REOPEN_APPROVAL_REQUIRED', 403);
}

export function assertEvidenceComplete(result: MilestoneEvidenceResult): void {
  if (!result.safe || !result.ownerMatches || result.count < result.requiredCount) throw new SupplyJourneyDomainError('MILESTONE_EVIDENCE_MISSING', 422);
}
