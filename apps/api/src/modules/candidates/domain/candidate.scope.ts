import { CandidateDomainError } from './candidate.rules.js';
import type { CandidateEntity } from './candidate.types.js';

export function assertCandidateScope(candidate: CandidateEntity, scope: { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' }): void {
  if (scope.level === 'SELF' && candidate.ownerId !== scope.ownerId) throw new CandidateDomainError('CANDIDATE_NOT_FOUND', 'candidate was not found', 404);
  if (scope.level === 'TEAM' && (!scope.teamId || candidate.teamId !== scope.teamId)) throw new CandidateDomainError('CANDIDATE_NOT_FOUND', 'candidate was not found', 404);
}
