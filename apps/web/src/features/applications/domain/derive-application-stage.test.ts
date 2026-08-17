import { describe, expect, it } from 'vitest';
import { deriveApplicationStage } from './derive-application-stage';

describe('deriveApplicationStage', () => {
  it.each([
    ['MATCHED', [], 'NEWLY_MATCHED'],
    ['IN_INTERVIEW_PROCESS', [{ scheduleStatus: 'SCHEDULED' }], 'WAITING_INTERVIEW'],
    ['IN_INTERVIEW_PROCESS', [{ scheduleStatus: 'COMPLETED', result: 'PENDING' }], 'WAITING_RESULT'],
    ['PASSED', [], 'PASSED'],
    ['FAILED', [], 'FAILED'],
    ['WITHDRAWN', [], 'WITHDRAWN']
  ] as const)('derives %s with interviews as %s', (status, interviews, expected) => {
    expect(deriveApplicationStage({ status } as never, interviews as never)).toBe(expected);
  });

  it('keeps multi-round applications visible in interviewed and waiting-interview views', () => {
    const interviews = [
      { scheduleStatus: 'COMPLETED', result: 'PASS' },
      { scheduleStatus: 'SCHEDULED', result: 'PENDING' }
    ];
    expect(deriveApplicationStage({ status: 'IN_INTERVIEW_PROCESS' } as never, interviews as never)).toBe('WAITING_INTERVIEW');
  });
});
