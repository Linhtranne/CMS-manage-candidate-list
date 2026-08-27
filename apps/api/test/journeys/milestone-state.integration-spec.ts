import { describe, expect, it } from 'vitest';
import { assertMilestoneTransition, dependenciesSatisfied } from '../../src/modules/supply-journeys/domain/journey-milestone.aggregate.js';
import type { JourneyMilestoneSnapshot } from '../../src/modules/supply-journeys/domain/supply-journey.aggregate.js';

const milestone = (overrides: Partial<JourneyMilestoneSnapshot> = {}): JourneyMilestoneSnapshot => ({ code: 'B', name: 'B', sequence: 2, dependencyCodes: ['A'], status: 'NOT_STARTED', ownerUserId: 'u1', dueAt: null, completedAt: null, blockerParty: null, blockerReason: null, expectedResolution: null, waiveReason: null, waivedBy: null, waivedAt: null, notApplicableReason: null, checklistData: {}, evidenceRequirement: [], attemptNo: 1, version: 1, ...overrides });
describe('milestone state machine', () => {
  it('requires dependency terminal acceptance and explicit blocker details', () => {
    expect(dependenciesSatisfied(milestone(), [milestone({ code: 'A', dependencyCodes: [], status: 'IN_PROGRESS' }), milestone()])).toBe(false);
    expect(dependenciesSatisfied(milestone(), [milestone({ code: 'A', dependencyCodes: [], status: 'WAIVED' }), milestone()])).toBe(true);
    expect(() => assertMilestoneTransition('NOT_STARTED', 'BLOCKED', {}, {})).toThrow(/MILESTONE_BLOCK_REASON_REQUIRED/);
  });
  it('requires approval for waiver and reopen', () => {
    expect(() => assertMilestoneTransition('IN_PROGRESS', 'WAIVED', { reason: 'skip' }, { canWaive: false })).toThrow(/MILESTONE_WAIVER_APPROVAL_REQUIRED/);
    expect(() => assertMilestoneTransition('COMPLETED', 'IN_PROGRESS', { reason: 'redo', approvalId: 'a1' }, { canReopen: true })).not.toThrow();
  });
});
