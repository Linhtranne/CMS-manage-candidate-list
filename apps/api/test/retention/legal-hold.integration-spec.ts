import { describe, expect, it } from 'vitest';
import { RetentionService } from '../../src/modules/retention/application/retention.service.js';
describe('retention gates', () => {
  it('keeps purge disabled and reports legal holds separately', async () => {
    const repo = { activeHold: async (t: string, id: string) => id === 'held', createHold: async () => ({ id: 'h1' }), releaseHold: async () => {}, findPurgeCandidates: async () => [{ entityType: 'Candidate', entityId: 'held' }, { entityType: 'Candidate', entityId: 'free' }], markPurged: async () => {} };
    const service = new RetentionService(repo, false); const plan = await service.dryRun('candidate-default', new Date('2026-01-01'));
    expect(plan.heldCount).toBe(1); expect(plan.eligibleCount).toBe(1); await expect(service.execute('candidate-default', new Date(), 'u1', 'approval')).rejects.toMatchObject({ code: 'PURGE_DISABLED' });
  });
});
