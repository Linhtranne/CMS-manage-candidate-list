import type { components } from '@cms/contracts';
import { deriveJourneyHealth } from '@/features/journeys/domain/derive-journey-health';

export type SupplyJourney = components['schemas']['SupplyJourney'];
export type SupplyJourneySummary = components['schemas']['SupplyJourneySummary'];
export type SupplyJourneyDetail = components['schemas']['SupplyJourneyDetail'];
export type JourneyMilestone = components['schemas']['JourneyMilestone'];
export type JourneyEvidence = components['schemas']['JourneyEvidence'];

const coordinator = { id: 'u-coordinator', name: 'Trần Quốc Huy' };
const manager = { id: 'u-manager', name: 'Lê Thu Hà' };
const recruiter = { id: 'u-recruiter', name: 'Nguyễn Minh Anh' };

const candidateVietnam = { id: 'candidate-05', code: 'UV-0005', name: 'Võ Thanh Tùng' };
const candidateJapan = { id: 'candidate-07', code: 'UV-0007', name: 'Lê Hoàng Yến' };

function milestone(input: Pick<JourneyMilestone, 'id' | 'code' | 'name' | 'sequence' | 'status'> & Partial<JourneyMilestone> & { journeyId: string }): JourneyMilestone {
  return {
    id: input.id,
    journeyId: input.journeyId,
    code: input.code,
    name: input.name,
    sequence: input.sequence,
    status: input.status,
    dueAt: input.dueAt ?? null,
    completedAt: input.completedAt ?? null,
    owner: input.owner ?? coordinator,
    blockerParty: input.blockerParty ?? null,
    blockerReason: input.blockerReason ?? null,
    naReason: input.naReason ?? null,
    waiverReason: input.waiverReason ?? null,
    evidenceIds: input.evidenceIds ?? [],
    requiredEvidenceCount: input.requiredEvidenceCount ?? 0,
    completedEvidenceCount: input.completedEvidenceCount ?? 0,
    version: input.version ?? 1
  };
}

const journeyOneMilestones: JourneyMilestone[] = [
  milestone({ id: 'milestone-01', journeyId: 'journey-01', code: 'OFFER_ACCEPTED', name: 'Xác nhận nhận việc', sequence: 1, status: 'COMPLETED', dueAt: '2026-07-03T09:00:00.000Z', completedAt: '2026-07-02T09:00:00.000Z' }),
  milestone({ id: 'milestone-02', journeyId: 'journey-01', code: 'COE_APPLICATION', name: 'Hồ sơ COE', sequence: 2, status: 'BLOCKED', dueAt: '2026-08-12T09:00:00.000Z', blockerParty: 'CANDIDATE', blockerReason: 'Chờ bổ sung bản scan hộ chiếu', requiredEvidenceCount: 2, completedEvidenceCount: 1, evidenceIds: ['evidence-passport'] }),
  milestone({ id: 'milestone-03', journeyId: 'journey-01', code: 'VISA_APPLICATION', name: 'Hồ sơ visa', sequence: 3, status: 'NOT_STARTED', dueAt: '2026-08-22T09:00:00.000Z' }),
  milestone({ id: 'milestone-04', journeyId: 'journey-01', code: 'DEPARTURE_PLAN', name: 'Kế hoạch xuất cảnh', sequence: 4, status: 'NOT_STARTED', dueAt: '2026-09-02T09:00:00.000Z' }),
  milestone({ id: 'milestone-05', journeyId: 'journey-01', code: 'CLIENT_RECEIVED', name: 'Doanh nghiệp tiếp nhận', sequence: 5, status: 'NOT_STARTED', dueAt: '2026-09-10T09:00:00.000Z' })
];

const journeyJapanMilestones: JourneyMilestone[] = [
  milestone({ id: 'milestone-jp-01', journeyId: 'journey-in-japan-01', code: 'OFFER_ACCEPTED', name: 'Xác nhận nhận việc', sequence: 1, status: 'COMPLETED', dueAt: '2026-07-03T09:00:00.000Z', completedAt: '2026-07-02T09:00:00.000Z' }),
  milestone({ id: 'milestone-jp-02', journeyId: 'journey-in-japan-01', code: 'STATUS_CHANGE', name: 'Hoàn tất thủ tục chuyển việc', sequence: 2, status: 'IN_PROGRESS', dueAt: '2026-08-20T09:00:00.000Z' }),
  milestone({ id: 'milestone-jp-03', journeyId: 'journey-in-japan-01', code: 'CLIENT_RECEIVED', name: 'Doanh nghiệp tiếp nhận', sequence: 3, status: 'NOT_STARTED', dueAt: '2026-08-28T09:00:00.000Z' })
];

export const journeyDetails: SupplyJourneyDetail[] = [
  {
    id: 'journey-01', candidateId: candidateVietnam.id, applicationId: 'application-journey-blocked', templateId: 'tokutei-it', templateVersion: 'v2', owner: manager, status: 'ACTIVE', startedAt: '2026-07-01T02:00:00.000Z', version: 2,
    candidate: candidateVietnam, order: { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm' }, client: { id: 'client-01', name: 'Sakura Tech Solutions' }, templateName: 'Cung ứng nhân sự từ Việt Nam', currentMilestone: 'Hồ sơ COE', nearestDueAt: '2026-08-12T09:00:00.000Z', progress: { completed: 1, applicable: 5 }, health: 'AT_RISK', milestones: journeyOneMilestones, evidence: [{ id: 'evidence-passport', milestoneId: 'milestone-02', fileName: 'passport-scan.pdf', scanStatus: 'SAFE', uploadedAt: '2026-08-08T09:00:00.000Z', uploadedBy: recruiter, downloadUrl: '/mock/files/passport-scan.pdf' }], history: [{ id: 'history-journey-01', type: 'JOURNEY_STARTED', occurredAt: '2026-07-01T02:00:00.000Z', actor: manager, summary: 'Khởi tạo lộ trình cung ứng.' }], hasDeparturePlan: true, departurePlan: { departureDate: null, airport: null, note: null }
  },
  {
    id: 'journey-in-japan-01', candidateId: candidateJapan.id, applicationId: 'application-passed-01', templateId: 'in-japan-change', templateVersion: 'v1', owner: coordinator, status: 'ACTIVE', startedAt: '2026-07-05T02:00:00.000Z', version: 1,
    candidate: candidateJapan, order: { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm' }, client: { id: 'client-01', name: 'Sakura Tech Solutions' }, templateName: 'Chuyển việc tại Nhật', currentMilestone: 'Hoàn tất thủ tục chuyển việc', nearestDueAt: '2026-08-20T09:00:00.000Z', progress: { completed: 1, applicable: 3 }, health: 'ON_TRACK', milestones: journeyJapanMilestones, evidence: [], history: [{ id: 'history-journey-jp-01', type: 'JOURNEY_STARTED', occurredAt: '2026-07-05T02:00:00.000Z', actor: coordinator, summary: 'Khởi tạo lộ trình chuyển việc tại Nhật.' }], hasDeparturePlan: false, departurePlan: null
  }
];

export const journeyFixtures: SupplyJourney[] = journeyDetails.map((detail) => ({ id: detail.id, candidateId: detail.candidateId, applicationId: detail.applicationId, templateId: detail.templateId, templateVersion: detail.templateVersion, owner: detail.owner, status: detail.status, startedAt: detail.startedAt, version: detail.version }));

export function toJourneySummary(detail: SupplyJourneyDetail): SupplyJourneySummary {
  const blocked = detail.milestones.some((item) => item.status === 'BLOCKED');
  const completed = detail.status === 'COMPLETED';
  return { id: detail.id, candidateId: detail.candidateId, applicationId: detail.applicationId, templateId: detail.templateId, templateVersion: detail.templateVersion, owner: detail.owner, status: detail.status, startedAt: detail.startedAt, version: detail.version, candidate: detail.candidate, order: detail.order, client: detail.client, templateName: detail.templateName, currentMilestone: detail.currentMilestone, nearestDueAt: detail.nearestDueAt, progress: detail.progress, health: deriveJourneyHealth({ dueAt: detail.nearestDueAt, blocked, completed }) };
}

export function findJourney(id: string) {
  return journeyDetails.find((journey) => journey.id === id);
}
