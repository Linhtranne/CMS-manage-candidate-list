import { describe, expect, it } from 'vitest';
import { deriveOperationalPhase } from './derive-operational-phase';

describe('deriveOperationalPhase', () => {
  it.each([
    [{ hasActiveJourney: true, hasCompletedJourney: false }, 'SUPPLYING'],
    [{ hasActiveJourney: false, hasCompletedJourney: true }, 'SUPPLIED'],
    [{ hasPassedApplication: true }, 'PASSED'],
    [{ hasActiveApplication: true }, 'APPLYING'],
    [{}, 'POTENTIAL']
  ])('derives %s from related records', (input, expected) => {
    expect(deriveOperationalPhase(input)).toBe(expected);
  });
});
