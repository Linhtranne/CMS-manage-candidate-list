import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { matchesApplicationView } from '@/features/applications/domain/derive-application-stage';
import { applicationFixtures, journeyFixtures, toApplicationDetail } from '../fixtures/applications';
import type { SupplyJourney } from '../fixtures/journeys';

type Application = components['schemas']['Application'];
type Interview = components['schemas']['Interview'];
type CreateInterviewRequest = components['schemas']['CreateInterviewRequest'];
type RescheduleInterviewRequest = components['schemas']['RescheduleInterviewRequest'];
type SaveInterviewResultRequest = components['schemas']['SaveInterviewResultRequest'];
type ApplicationDecisionRequest = components['schemas']['ApplicationDecisionRequest'];
type StartSupplyJourneyRequest = components['schemas']['StartSupplyJourneyRequest'];

const actor = { id: 'u-recruiter', name: 'Nguyễn Minh Anh' };
const problem = (code: string, message: string, status: number) => HttpResponse.json({ code, message, traceId: `mock-${code.toLowerCase()}` }, { status });
type PathParam = string | readonly string[] | undefined;
const findApplication = (id: PathParam) => id === undefined ? undefined : applicationFixtures.find((item) => item.id === String(id));
const findInterview = (application: Application, id: PathParam) => id === undefined ? undefined : application.interviews.find((item) => item.id === String(id));

function validateSchedule(body: CreateInterviewRequest) {
  if (!body.timeZone) return 'Vui lòng chọn múi giờ';
  if (body.mode === 'ONLINE' && !body.meetingUrl) return 'Vui lòng nhập đường dẫn phòng phỏng vấn hợp lệ';
  if (body.mode === 'IN_PERSON' && !body.location) return 'Vui lòng nhập địa điểm phỏng vấn';
  if (body.meetingUrl && !/^https?:\/\//.test(body.meetingUrl)) return 'Đường dẫn phòng phỏng vấn không hợp lệ';
  return undefined;
}

function newInterview(body: CreateInterviewRequest, application: Application): Interview {
  const now = new Date().toISOString();
  return {
    id: `interview-${application.id}-${application.interviews.length + 1}`,
    round: application.interviews.length + 1,
    scheduledAt: body.scheduledAt,
    timeZone: body.timeZone,
    mode: body.mode,
    meetingUrl: body.meetingUrl ?? null,
    location: body.location ?? null,
    participants: body.participants.map((id) => ({ id, name: id === actor.id ? actor.name : 'Người tham gia' })),
    scheduleStatus: 'SCHEDULED',
    result: 'PENDING',
    feedback: null,
    strengths: [],
    concerns: [],
    nextStep: null,
    version: 1,
    history: [{ id: `event-${application.id}-${application.interviews.length + 1}`, type: 'SCHEDULED', occurredAt: now, actor, summary: `Lên lịch vòng ${application.interviews.length + 1}.` }],
    createdAt: now,
    updatedAt: now
  };
}

export const applicationsHandlers = [
  http.get('*/api/v1/applications', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const view = url.searchParams.get('view');
    const orderId = url.searchParams.get('orderId');
    const ownerId = url.searchParams.get('ownerId');
    const items = applicationFixtures.filter((item) => {
      const haystack = `${item.id} ${item.candidate.code} ${item.candidate.name} ${item.order.code} ${item.order.position} ${item.client.name}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!view || matchesApplicationView(item, view)) && (!orderId || item.order.id === orderId) && (!ownerId || item.owner.id === ownerId);
    });
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.get('*/api/v1/applications/:id', ({ params }) => {
    const application = findApplication(params.id);
    return application ? HttpResponse.json(toApplicationDetail(application)) : problem('NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
  }),
  http.post('*/api/v1/applications/:id/interviews', async ({ params, request }) => {
    const application = findApplication(params.id);
    if (!application) return problem('NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    const body = (await request.json()) as CreateInterviewRequest;
    if (body.version !== application.version) return problem('VERSION_CONFLICT', 'Đơn ứng tuyển vừa được cập nhật, hãy tải lại.', 409);
    const validation = validateSchedule(body);
    if (validation) return problem('VALIDATION_ERROR', validation, 422);
    const item = newInterview(body, application);
    application.interviews.push(item);
    application.status = 'IN_INTERVIEW_PROCESS';
    application.version += 1;
    application.lastActivityAt = new Date().toISOString();
    return HttpResponse.json(item, { status: 201 });
  }),
  http.post('*/api/v1/applications/:id/interviews/:interviewId/reschedules', async ({ params, request }) => {
    const application = findApplication(params.id);
    const item = application && findInterview(application, params.interviewId);
    if (!application || !item) return problem('NOT_FOUND', 'Không tìm thấy vòng phỏng vấn', 404);
    const body = (await request.json()) as RescheduleInterviewRequest;
    if (body.version !== item.version) return problem('VERSION_CONFLICT', 'Lịch phỏng vấn vừa được cập nhật, hãy tải lại.', 409);
    if (!body.reason?.trim()) return problem('VALIDATION_ERROR', 'Vui lòng nhập lý do đổi lịch', 422);
    const validation = validateSchedule(body);
    if (validation) return problem('VALIDATION_ERROR', validation, 422);
    const previousScheduledAt = item.scheduledAt;
    const now = new Date().toISOString();
    Object.assign(item, { scheduledAt: body.scheduledAt, timeZone: body.timeZone, mode: body.mode, meetingUrl: body.meetingUrl ?? null, location: body.location ?? null, version: item.version + 1, updatedAt: now, history: [...item.history, { id: `event-reschedule-${item.id}-${item.version}`, type: 'RESCHEDULED' as const, occurredAt: now, actor, summary: 'Đổi lịch phỏng vấn.', previousScheduledAt, reason: body.reason }] });
    application.version += 1;
    application.lastActivityAt = now;
    return HttpResponse.json(item);
  }),
  http.post('*/api/v1/applications/:id/interviews/:interviewId/cancellation', async ({ params, request }) => {
    const application = findApplication(params.id);
    const item = application && findInterview(application, params.interviewId);
    if (!application || !item) return problem('NOT_FOUND', 'Không tìm thấy vòng phỏng vấn', 404);
    const body = (await request.json()) as { reason: string; version: number };
    if (body.version !== item.version) return problem('VERSION_CONFLICT', 'Lịch phỏng vấn vừa được cập nhật, hãy tải lại.', 409);
    if (!body.reason?.trim()) return problem('VALIDATION_ERROR', 'Vui lòng nhập lý do hủy lịch', 422);
    const now = new Date().toISOString();
    Object.assign(item, { scheduleStatus: 'CANCELLED' as const, version: item.version + 1, updatedAt: now, history: [...item.history, { id: `event-cancel-${item.id}-${item.version}`, type: 'CANCELLED' as const, occurredAt: now, actor, summary: 'Hủy lịch phỏng vấn.', reason: body.reason }] });
    application.version += 1;
    application.lastActivityAt = now;
    return HttpResponse.json(item);
  }),
  http.post('*/api/v1/applications/:id/interviews/:interviewId/no-show', async ({ params, request }) => {
    const application = findApplication(params.id);
    const item = application && findInterview(application, params.interviewId);
    if (!application || !item) return problem('NOT_FOUND', 'Không tìm thấy vòng phỏng vấn', 404);
    const body = (await request.json()) as { reason: string; version: number };
    if (body.version !== item.version) return problem('VERSION_CONFLICT', 'Lịch phỏng vấn vừa được cập nhật, hãy tải lại.', 409);
    if (!body.reason?.trim()) return problem('VALIDATION_ERROR', 'Vui lòng nhập lý do không đến', 422);
    const now = new Date().toISOString();
    Object.assign(item, { scheduleStatus: 'NO_SHOW' as const, version: item.version + 1, updatedAt: now, history: [...item.history, { id: `event-no-show-${item.id}-${item.version}`, type: 'CANCELLED' as const, occurredAt: now, actor, summary: 'Đánh dấu ứng viên không đến.', reason: body.reason }] });
    application.version += 1;
    application.lastActivityAt = now;
    return HttpResponse.json(item);
  }),
  http.post('*/api/v1/applications/:id/interviews/:interviewId/results', async ({ params, request }) => {
    const application = findApplication(params.id);
    const item = application && findInterview(application, params.interviewId);
    if (!application || !item) return problem('NOT_FOUND', 'Không tìm thấy vòng phỏng vấn', 404);
    const body = (await request.json()) as SaveInterviewResultRequest;
    if (body.version !== item.version) return problem('VERSION_CONFLICT', 'Vòng phỏng vấn vừa được cập nhật, hãy tải lại.', 409);
    if (item.scheduleStatus !== 'COMPLETED') return problem('VALIDATION_ERROR', 'Chỉ ghi kết quả sau khi vòng phỏng vấn hoàn tất.', 422);
    if (!body.feedback?.trim()) return problem('VALIDATION_ERROR', 'Vui lòng nhập nhận xét phỏng vấn', 422);
    const now = new Date().toISOString();
    Object.assign(item, { result: body.result, feedback: body.feedback, strengths: body.strengths, concerns: body.concerns, nextStep: body.nextStep ?? null, version: item.version + 1, updatedAt: now, history: [...item.history, { id: `event-result-${item.id}-${item.version}`, type: 'RESULT_RECORDED' as const, occurredAt: now, actor, summary: `Ghi kết quả ${body.result}.` }] });
    application.version += 1;
    application.lastActivityAt = now;
    return HttpResponse.json(item);
  }),
  http.post('*/api/v1/applications/:id/decisions', async ({ params, request }) => {
    const application = findApplication(params.id);
    if (!application) return problem('NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    const body = (await request.json()) as ApplicationDecisionRequest;
    if (body.version !== application.version) return problem('VERSION_CONFLICT', 'Đơn ứng tuyển vừa được cập nhật, hãy tải lại.', 409);
    const hasResult = application.interviews.some((item) => item.scheduleStatus === 'COMPLETED' && item.result !== 'PENDING');
    if (body.status === 'PASSED' && !hasResult) return problem('RESULT_REQUIRED', 'Cần nhập kết quả phỏng vấn trước khi xác nhận trúng tuyển.', 422);
    if ((body.status === 'FAILED' || body.status === 'WITHDRAWN') && !body.reasonCode?.trim()) return problem('REASON_REQUIRED', 'Cần chọn lý do kết thúc đơn.', 422);
    const matchingResult = application.interviews.find((item) => item.scheduleStatus === 'COMPLETED' && item.result !== 'PENDING');
    if (body.status === 'PASSED' && matchingResult?.result !== 'PASS') return problem('RESULT_NOT_PASS', 'Kết quả phỏng vấn chưa đạt để xác nhận trúng tuyển.', 422);
    application.status = body.status;
    application.decisionReason = body.reasonCode ?? body.note ?? null;
    application.version += 1;
    application.lastActivityAt = body.decidedAt;
    return HttpResponse.json(application);
  }),
  http.get('*/api/v1/applications/:id/journey-eligibility', ({ params }) => {
    const application = findApplication(params.id);
    if (!application) return problem('NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    const activeJourney = journeyFixtures.find((journey) => journey.candidateId === application.candidate.id && ['ACTIVE', 'ON_HOLD'].includes(journey.status));
    const allowed = application.status === 'PASSED' && !activeJourney;
    return HttpResponse.json({ allowed, reasons: application.status !== 'PASSED' ? ['Đơn ứng tuyển chưa ở trạng thái trúng tuyển.'] : activeJourney ? ['Ứng viên đang có lộ trình cung ứng hiệu lực.'] : [], activeJourney: activeJourney ?? null, templates: [{ id: 'tokutei-it', name: 'Cung ứng nhân sự Nhật Bản', version: 'v2' }, { id: 'care-basic', name: 'Cung ứng ngành chăm sóc', version: 'v1' }] });
  }),
  http.post('*/api/v1/applications/:id/supply-journey', async ({ params, request }) => {
    const application = findApplication(params.id);
    if (!application) return problem('NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    const body = (await request.json()) as StartSupplyJourneyRequest;
    const activeJourney = journeyFixtures.find((journey) => journey.candidateId === application.candidate.id && ['ACTIVE', 'ON_HOLD'].includes(journey.status));
    if (application.status !== 'PASSED') return problem('APPLICATION_NOT_PASSED', 'Chỉ ứng viên trúng tuyển mới được khởi tạo lộ trình.', 422);
    if (activeJourney) return problem('ACTIVE_JOURNEY_EXISTS', 'Ứng viên đang có lộ trình cung ứng hiệu lực.', 409);
    if (!body.templateId || !body.templateVersion || !body.ownerUserId || !body.startedAt) return problem('VALIDATION_ERROR', 'Cần chọn mẫu, phiên bản, người phụ trách và ngày bắt đầu.', 422);
    const journey: SupplyJourney = { id: `journey-${journeyFixtures.length + 1}`, candidateId: application.candidate.id, applicationId: application.id, templateId: body.templateId, templateVersion: body.templateVersion, owner: { id: body.ownerUserId, name: body.ownerUserId === actor.id ? actor.name : 'Người phụ trách' }, status: 'ACTIVE', startedAt: body.startedAt, version: 1 };
    journeyFixtures.push(journey);
    return HttpResponse.json(journey, { status: 201 });
  })
];
