import type { components } from '@cms/contracts';
export { journeyFixtures } from './journeys';

export type Application = components['schemas']['Application'];
export type Interview = components['schemas']['Interview'];
export type ApplicationDetail = components['schemas']['ApplicationDetail'];

const recruiter = { id: 'u-recruiter', name: 'Nguyễn Minh Anh' };
const manager = { id: 'u-manager', name: 'Lê Thu Hà' };

function interview(overrides: Partial<Interview> & Pick<Interview, 'id' | 'round' | 'scheduledAt' | 'scheduleStatus' | 'result'>): Interview {
  return {
    id: overrides.id,
    round: overrides.round,
    scheduledAt: overrides.scheduledAt,
    timeZone: 'Asia/Ho_Chi_Minh',
    mode: 'ONLINE',
    meetingUrl: 'https://meet.example.com/candidate-supply',
    location: null,
    participants: [recruiter, manager],
    scheduleStatus: overrides.scheduleStatus,
    result: overrides.result,
    feedback: overrides.feedback ?? null,
    strengths: overrides.strengths ?? [],
    concerns: overrides.concerns ?? [],
    nextStep: overrides.nextStep ?? null,
    version: overrides.version ?? 1,
    history: overrides.history ?? [],
    createdAt: overrides.createdAt ?? '2026-08-01T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-08-01T08:00:00.000Z'
  };
}

const base = {
  client: { id: 'client-01', name: 'Sakura Tech Solutions' },
  order: { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm' },
  owner: recruiter,
  source: 'MANUAL_MATCH' as const
};

export const applicationFixtures: Application[] = [
  {
    id: 'application-new-01',
    candidate: { id: 'candidate-06', code: 'UV-0006', name: 'Đỗ Mai Lan' },
    ...base,
    status: 'MATCHED',
    appliedAt: '2026-08-13T04:00:00.000Z',
    lastActivityAt: '2026-08-13T04:00:00.000Z',
    dueAt: '2026-08-18T09:00:00.000Z',
    version: 1,
    interviews: []
  },
  {
    id: 'application-waiting-01',
    candidate: { id: 'candidate-01', code: 'UV-0001', name: 'Nguyễn Minh An' },
    ...base,
    status: 'IN_INTERVIEW_PROCESS',
    appliedAt: '2026-08-08T04:00:00.000Z',
    lastActivityAt: '2026-08-12T03:00:00.000Z',
    dueAt: '2026-08-20T02:00:00.000Z',
    version: 2,
    interviews: [interview({ id: 'interview-waiting-01', round: 1, scheduledAt: '2026-08-20T02:00:00.000Z', scheduleStatus: 'SCHEDULED', result: 'PENDING' })]
  },
  {
    id: 'application-result-01',
    candidate: { id: 'candidate-02', code: 'UV-0002', name: 'Trần Quốc Bảo' },
    ...base,
    status: 'IN_INTERVIEW_PROCESS',
    appliedAt: '2026-08-01T04:00:00.000Z',
    lastActivityAt: '2026-08-12T09:00:00.000Z',
    dueAt: '2026-08-13T02:00:00.000Z',
    version: 3,
    interviews: [interview({ id: 'interview-result-01', round: 1, scheduledAt: '2026-08-12T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'PENDING' })]
  },
  {
    id: 'application-multi-round',
    candidate: { id: 'candidate-03', code: 'UV-0003', name: 'Phạm Hoàng Nam' },
    ...base,
    status: 'IN_INTERVIEW_PROCESS',
    appliedAt: '2026-07-28T04:00:00.000Z',
    lastActivityAt: '2026-08-13T08:00:00.000Z',
    dueAt: '2026-08-21T02:00:00.000Z',
    version: 4,
    interviews: [
      interview({ id: 'interview-multi-01', round: 1, scheduledAt: '2026-08-06T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'PASS', feedback: 'Đạt vòng chuyên môn.' }),
      interview({ id: 'interview-multi-02', round: 2, scheduledAt: '2026-08-21T02:00:00.000Z', scheduleStatus: 'SCHEDULED', result: 'PENDING' })
    ]
  },
  {
    id: 'application-interviewed-01',
    candidate: { id: 'candidate-04', code: 'UV-0004', name: 'Vũ Thanh Tùng' },
    ...base,
    status: 'IN_INTERVIEW_PROCESS',
    appliedAt: '2026-07-20T04:00:00.000Z',
    lastActivityAt: '2026-08-10T09:00:00.000Z',
    dueAt: '2026-08-11T02:00:00.000Z',
    version: 3,
    interviews: [interview({ id: 'interview-done-01', round: 1, scheduledAt: '2026-08-10T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'PASS', feedback: 'Đủ năng lực.' })]
  },
  {
    id: 'application-passed-01',
    candidate: { id: 'candidate-07', code: 'UV-0007', name: 'Lê Hoàng Yến' },
    ...base,
    status: 'PASSED',
    appliedAt: '2026-07-10T04:00:00.000Z',
    lastActivityAt: '2026-08-09T09:00:00.000Z',
    dueAt: null,
    version: 5,
    interviews: [interview({ id: 'interview-passed-01', round: 1, scheduledAt: '2026-08-08T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'PASS', feedback: 'Phù hợp đơn tuyển.' })]
  },
  {
    id: 'application-journey-blocked',
    candidate: { id: 'candidate-05', code: 'UV-0005', name: 'Võ Thanh Tùng' },
    ...base,
    status: 'PASSED',
    appliedAt: '2026-07-05T04:00:00.000Z',
    lastActivityAt: '2026-08-07T09:00:00.000Z',
    dueAt: null,
    version: 5,
    interviews: [interview({ id: 'interview-blocked-01', round: 1, scheduledAt: '2026-08-05T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'PASS', feedback: 'Đã đạt.' })]
  },
  {
    id: 'application-failed-01',
    candidate: { id: 'candidate-08', code: 'UV-0008', name: 'Nguyễn Thị Hạnh' },
    ...base,
    status: 'FAILED',
    decisionReason: 'Không đạt yêu cầu tiếng Nhật',
    appliedAt: '2026-07-01T04:00:00.000Z',
    lastActivityAt: '2026-08-04T09:00:00.000Z',
    dueAt: null,
    version: 4,
    interviews: [interview({ id: 'interview-failed-01', round: 1, scheduledAt: '2026-08-04T02:00:00.000Z', scheduleStatus: 'COMPLETED', result: 'FAIL', feedback: 'Cần cải thiện giao tiếp.' })]
  }
];

export function toApplicationDetail(application: Application): ApplicationDetail {
  return {
    ...application,
    history: [
      { id: `${application.id}-created`, type: 'APPLICATION_CREATED', occurredAt: application.appliedAt, actor: application.owner, summary: 'Tạo đơn ứng tuyển từ danh sách ghép ứng viên.' },
      ...application.interviews.flatMap((item) => item.history.map((event) => ({ id: event.id, type: 'INTERVIEW_UPDATED' as const, occurredAt: event.occurredAt, actor: event.actor, summary: event.summary, metadata: { interviewId: item.id } })))
    ],
    notes: [],
    files: []
  };
}
