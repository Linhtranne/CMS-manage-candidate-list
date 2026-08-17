export type OperationalPhase = 'POTENTIAL' | 'APPLYING' | 'PASSED' | 'SUPPLYING' | 'SUPPLIED';

export type OperationalPhaseInput = {
  hasActiveJourney?: boolean;
  hasCompletedJourney?: boolean;
  hasPassedApplication?: boolean;
  hasActiveApplication?: boolean;
};

export function deriveOperationalPhase(input: OperationalPhaseInput): OperationalPhase {
  if (input.hasActiveJourney) return 'SUPPLYING';
  if (input.hasCompletedJourney) return 'SUPPLIED';
  if (input.hasPassedApplication) return 'PASSED';
  if (input.hasActiveApplication) return 'APPLYING';
  return 'POTENTIAL';
}
