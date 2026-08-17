import { describe, expect, it } from 'vitest';
import { fetchWorkItems } from './work-queries';

describe('work queries', () => {
  it('requests the default actionable view', async () => {
    const result = await fetchWorkItems({ view: 'actionable', sort: 'priority' });

    expect(result.items[0]).toMatchObject({
      id: 'work-overdue-01',
      sourceType: 'INTERVIEW_RESULT_DUE'
    });
  });
});
