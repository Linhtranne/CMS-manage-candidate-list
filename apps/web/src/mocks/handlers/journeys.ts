import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { deriveJourneyHealth } from '@/features/journeys/domain/derive-journey-health';
import { findJourney, journeyDetails, toJourneySummary } from '../fixtures/journeys';

type UpdateMilestoneRequest = components['schemas']['UpdateMilestoneRequest'];
type WaiveMilestoneRequest = components['schemas']['WaiveMilestoneRequest'];
const actor = { id: 'u-coordinator', name: 'Trần Quốc Huy' };
const problem = (code: string, message: string, status: number) => HttpResponse.json({ code, message, traceId: `mock-${code.toLowerCase()}` }, { status });

function recalculate(detail: components['schemas']['SupplyJourneyDetail']) {
  const applicable = detail.milestones.filter((item) => item.status !== 'NOT_APPLICABLE');
  const completed = applicable.filter((item) => item.status === 'COMPLETED' || item.status === 'WAIVED').length;
  const current = applicable.find((item) => !['COMPLETED', 'WAIVED'].includes(item.status));
  const dueDates = applicable.map((item) => item.dueAt).filter((item): item is string => Boolean(item) && !['COMPLETED', 'WAIVED'].includes(applicable.find((candidate) => candidate.dueAt === item)?.status ?? ''));
  const nearestDueAt = dueDates.sort()[0] ?? null;
  detail.progress = { completed, applicable: applicable.length };
  detail.currentMilestone = current?.name ?? 'Hoàn tất cung ứng';
  detail.nearestDueAt = nearestDueAt;
  if (completed === applicable.length && applicable.length > 0) detail.status = 'COMPLETED';
  detail.health = deriveJourneyHealth({ dueAt: nearestDueAt, blocked: detail.milestones.some((item) => item.status === 'BLOCKED'), completed: detail.status === 'COMPLETED' });
}

export const journeysHandlers = [
  http.get('*/api/v1/supply-journeys', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const view = url.searchParams.get('view') ?? 'all';
    const ownerId = url.searchParams.get('ownerId');
    const items = journeyDetails.filter((detail) => {
      const haystack = `${detail.candidate.name} ${detail.candidate.code} ${detail.order.code} ${detail.client.name} ${detail.templateName}`.toLowerCase();
      const summary = toJourneySummary(detail);
      const waitingCandidate = detail.milestones.some((item) => item.status === 'BLOCKED' && item.blockerParty === 'CANDIDATE');
      const waitingExternal = detail.milestones.some((item) => item.status === 'BLOCKED' && item.blockerParty === 'CLIENT_PARTNER');
      const matchesView = view === 'all' || (view === 'active' && detail.status === 'ACTIVE') || (view === 'on-hold' && detail.status === 'ON_HOLD') || (view === 'completed' && detail.status === 'COMPLETED') || (view === 'cancelled' && detail.status === 'CANCELLED') || (view === 'at-risk' && summary.health === 'AT_RISK') || (view === 'overdue' && summary.health === 'OVERDUE') || (view === 'waiting-candidate' && waitingCandidate) || (view === 'waiting-external' && waitingExternal) || (view === 'near-complete' && summary.progress.applicable > 0 && summary.progress.completed >= summary.progress.applicable - 1);
      return (!query || haystack.includes(query)) && (!ownerId || detail.owner.id === ownerId) && matchesView;
    }).map(toJourneySummary);
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.get('*/api/v1/supply-journeys/:id', ({ params }) => {
    const detail = findJourney(String(params.id));
    return detail ? HttpResponse.json(detail) : problem('NOT_FOUND', 'Không tìm thấy lộ trình cung ứng', 404);
  }),
  http.patch('*/api/v1/supply-journeys/:id/milestones/:milestoneId', async ({ params, request }) => {
    const detail = findJourney(String(params.id));
    const milestone = detail?.milestones.find((item) => item.id === String(params.milestoneId));
    if (!detail || !milestone) return problem('NOT_FOUND', 'Không tìm thấy mốc lộ trình', 404);
    const body = (await request.json()) as UpdateMilestoneRequest;
    if (body.version !== milestone.version) return problem('VERSION_CONFLICT', 'Mốc vừa được cập nhật, hãy tải lại.', 409);
    if (body.status === 'WAIVED') return problem('WAIVER_REQUIRED', 'Mốc miễn trừ phải được xác nhận bằng luồng phê duyệt.', 422);
    if (body.status === 'COMPLETED' && milestone.requiredEvidenceCount > body.evidenceIds.length) return problem('EVIDENCE_REQUIRED', 'Mốc chưa đủ bằng chứng bắt buộc.', 422);
    if (body.status === 'BLOCKED' && (!body.blockerParty || !body.blockerReason?.trim())) return problem('BLOCKER_REQUIRED', 'Cần chọn bên đang chặn và nhập lý do.', 422);
    if (body.status === 'NOT_APPLICABLE' && !body.naReason?.trim()) return problem('REASON_REQUIRED', 'Cần nhập lý do không áp dụng.', 422);
    const now = new Date().toISOString();
    Object.assign(milestone, { status: body.status, blockerParty: body.blockerParty ?? null, blockerReason: body.blockerReason ?? null, naReason: body.naReason ?? null, evidenceIds: body.evidenceIds, completedAt: body.status === 'COMPLETED' ? now : null, version: milestone.version + 1 });
    detail.version += 1;
    recalculate(detail);
    detail.history.unshift({ id: `history-${detail.id}-${detail.version}`, type: 'MILESTONE_UPDATED', occurredAt: now, actor, summary: `Cập nhật mốc ${milestone.name}.` });
    return HttpResponse.json(milestone);
  }),
  http.post('*/api/v1/supply-journeys/:id/milestones/:milestoneId/waiver', async ({ params, request }) => {
    const detail = findJourney(String(params.id));
    const milestone = detail?.milestones.find((item) => item.id === String(params.milestoneId));
    if (!detail || !milestone) return problem('NOT_FOUND', 'Không tìm thấy mốc lộ trình', 404);
    const body = (await request.json()) as WaiveMilestoneRequest;
    if (body.version !== milestone.version) return problem('VERSION_CONFLICT', 'Mốc vừa được cập nhật, hãy tải lại.', 409);
    if (!body.reason?.trim() || !body.approverId?.trim()) return problem('WAIVER_DATA_REQUIRED', 'Miễn trừ cần lý do và người duyệt.', 422);
    const now = new Date().toISOString();
    Object.assign(milestone, { status: 'WAIVED' as const, waiverReason: body.reason, evidenceIds: body.evidenceIds, approver: { id: body.approverId, name: body.approverId === actor.id ? actor.name : 'Người duyệt' }, completedAt: now, version: milestone.version + 1 });
    detail.version += 1;
    recalculate(detail);
    detail.history.unshift({ id: `history-${detail.id}-${detail.version}`, type: 'MILESTONE_WAIVED', occurredAt: now, actor, summary: `Miễn trừ mốc ${milestone.name}.` });
    return HttpResponse.json(milestone);
  })
];
