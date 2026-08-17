import { describe, expect, it } from 'vitest';
import { deriveJourneyHealth, deriveWaitingView } from './derive-journey-health';

describe('deriveJourneyHealth', () => {
  it.each([
    [{ completed: true }, 'COMPLETED'],
    [{ blocked: true }, 'AT_RISK'],
    [{ dueAt: '2026-08-10T00:00:00Z', now: '2026-08-14T00:00:00Z' }, 'OVERDUE'],
    [{ dueAt: '2026-08-20T00:00:00Z', now: '2026-08-14T00:00:00Z' }, 'ON_TRACK']
  ])('derives journey health', (input, expected) => {
    expect(deriveJourneyHealth(input)).toBe(expected);
  });

  it('derives waiting view from blocker party', () => {
    expect(deriveWaitingView({ status: 'BLOCKED', blockerParty: 'CANDIDATE' } as never)).toBe('WAITING_CANDIDATE');
    expect(deriveWaitingView({ status: 'BLOCKED', blockerParty: 'CLIENT_PARTNER' } as never)).toBe('WAITING_EXTERNAL');
  });
});
