import type { components } from '@cms/contracts';

export type JourneyHealth = components['schemas']['SupplyJourneySummary']['health'];
export type WaitingView = 'WAITING_CANDIDATE' | 'WAITING_EXTERNAL' | 'BLOCKED' | null;

export function deriveJourneyHealth({ now = new Date().toISOString(), dueAt, blocked = false, completed = false }: { now?: string; dueAt?: string | null; blocked?: boolean; completed?: boolean }): JourneyHealth {
  if (completed) return 'COMPLETED';
  if (blocked) return 'AT_RISK';
  if (dueAt && new Date(dueAt).getTime() < new Date(now).getTime()) return 'OVERDUE';
  return 'ON_TRACK';
}

export function deriveWaitingView(milestone: components['schemas']['JourneyMilestone']): WaitingView {
  if (milestone.status !== 'BLOCKED') return null;
  if (milestone.blockerParty === 'CANDIDATE') return 'WAITING_CANDIDATE';
  if (milestone.blockerParty === 'CLIENT_PARTNER') return 'WAITING_EXTERNAL';
  return 'BLOCKED';
}

export function isApplicableMilestone(milestone: components['schemas']['JourneyMilestone']) {
  return milestone.status !== 'NOT_APPLICABLE';
}
