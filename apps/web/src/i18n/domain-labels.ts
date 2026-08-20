import type { Translate, TranslationKey } from './types';

const domainLabelKeys = {
  emailStatus: {
    RECEIVED: 'mailbox.emailStatus.received',
    QUEUED: 'mailbox.emailStatus.queued',
    SENDING: 'mailbox.emailStatus.sending',
    SENT: 'mailbox.emailStatus.sent',
    FAILED: 'mailbox.emailStatus.failed',
    BOUNCED: 'mailbox.emailStatus.bounced'
  },
  conversationStatus: {
    NEEDS_ACTION: 'mailbox.conversationStatus.needsAction',
    MATCHED: 'mailbox.conversationStatus.matched',
    UNMATCHED: 'mailbox.conversationStatus.unmatched',
    SENT: 'mailbox.conversationStatus.sent',
    RECEIVED: 'mailbox.conversationStatus.received',
    CLOSED: 'mailbox.conversationStatus.closed'
  },
  candidateRecordStatus: {
    ACTIVE: 'candidates.detail.active',
    ARCHIVED: 'candidates.detail.archived'
  },
  clientStatus: {
    ACTIVE: 'clients.table.activeStatus',
    PROSPECT: 'clients.table.prospectStatus',
    PAUSED: 'clients.list.paused',
    INACTIVE: 'clients.form.inactive'
  },
  applicationStatus: {
    MATCHED: 'candidates.detail.applications.matched',
    IN_INTERVIEW_PROCESS: 'candidates.detail.applications.interviewing',
    PASSED: 'candidates.detail.applications.passed',
    FAILED: 'applications.profile.fail',
    WITHDRAWN: 'applications.views.withdrawn',
    CLOSED: 'applications.views.closed'
  },
  orderStatus: {
    DRAFT: 'orders.status.draft',
    RECRUITING: 'orders.status.recruiting',
    PAUSED: 'orders.status.paused',
    FILLED: 'orders.status.filled',
    CLOSED: 'orders.status.closed'
  },
  orderHealth: {
    UNDER_TARGET: 'orders.table.underTarget',
    INTERVIEW_DELAY: 'orders.table.interviewDelay',
    EXPIRING: 'orders.table.expiring',
    FILLED: 'orders.status.filled'
  },
  journeyHealth: {
    ON_TRACK: 'journeys.table.onTrack',
    AT_RISK: 'journeys.table.atRisk',
    OVERDUE: 'journeys.table.overdue',
    COMPLETED: 'journeys.table.completed'
  },
  milestoneStatus: {
    NOT_STARTED: 'journeys.milestone.statuses.notStarted',
    IN_PROGRESS: 'journeys.milestone.statuses.inProgress',
    COMPLETED: 'journeys.milestone.statuses.completed',
    BLOCKED: 'journeys.milestone.statuses.blocked',
    WAIVED: 'journeys.milestone.statuses.waived',
    NOT_APPLICABLE: 'journeys.milestone.statuses.notApplicable'
  },
  templateType: {
    EMAIL: 'adminExtra.templates.email',
    JOURNEY: 'adminExtra.templates.journey'
  },
  templateStatus: {
    ACTIVE: 'adminExtra.templates.active',
    RETIRED: 'adminExtra.templates.retired',
    DRAFT: 'adminExtra.templates.draft'
  },
  catalogType: {
    INDUSTRY: 'admin.catalogs.industry',
    OCCUPATION: 'admin.catalogs.occupation',
    VISA_ROUTE: 'admin.catalogs.visaRoute',
    SOURCE: 'admin.catalogs.source'
  },
  adminRole: {
    recruiter: 'adminRoleNames.recruiter',
    business: 'adminRoleNames.business',
    coordinator: 'adminRoleNames.coordinator',
    manager: 'adminRoleNames.manager',
    'config-admin': 'adminRoleNames.config-admin',
    auditor: 'adminRoleNames.auditor'
  },
  adminRoleDescription: {
    recruiter: 'adminRoleDescriptions.recruiter',
    business: 'adminRoleDescriptions.business',
    coordinator: 'adminRoleDescriptions.coordinator',
    manager: 'adminRoleDescriptions.manager',
    'config-admin': 'adminRoleDescriptions.config-admin',
    auditor: 'adminRoleDescriptions.auditor'
  },
  adminTeam: {
    'team-recruiting': 'adminTeamNames.team-recruiting',
    'team-coordination': 'adminTeamNames.team-coordination',
    'team-platform': 'adminTeamNames.team-platform',
    'team-compliance': 'adminTeamNames.team-compliance'
  },
  auditAction: {
    REPORT_EXPORT_REQUESTED: 'reports.export.create',
    TEMPLATE_RETIRED: 'adminExtra.templates.retire',
    EMAIL_SENT: 'mailbox.send.sent',
    ROLE_UPDATED: 'admin.matrix.save',
    MAILBOX_SETTINGS_UPDATED: 'adminExtra.mailbox.save'
  },
  auditResourceType: {
    REPORT: 'reports.page.title',
    EMAIL_TEMPLATE: 'adminExtra.templates.title',
    CONVERSATION: 'mailbox.thread.link',
    ROLE: 'admin.matrix.permission',
    MAILBOX: 'adminExtra.mailbox.title'
  },
  auditSource: {
    UI: 'admin.audit.source',
    EMAIL: 'mailbox.send.sent'
  },
  workSource: {
    INTERVIEW_RESULT_DUE: 'work.sourceTypes.interviewResultDue',
    INTERVIEW_SCHEDULED: 'work.sourceTypes.interviewScheduled',
    CANDIDATE_EMAIL_REPLY: 'work.sourceTypes.candidateEmailReply',
    MILESTONE_BLOCKED: 'work.sourceTypes.milestoneBlocked'
  },
  milestoneName: {
    OFFER_ACCEPTED: 'catalog.milestone.offerAccepted',
    COE_APPLICATION: 'catalog.milestone.coeApplication',
    VISA_APPLICATION: 'catalog.milestone.visaApplication',
    DEPARTURE_PLAN: 'catalog.milestone.departurePlan',
    CLIENT_RECEIVED: 'catalog.milestone.clientReceived',
    STATUS_CHANGE: 'catalog.milestone.statusChange',
    'Xác nhận nhận việc': 'catalog.milestone.offerAccepted',
    'Hồ sơ COE': 'catalog.milestone.coeApplication',
    'Hồ sơ visa': 'catalog.milestone.visaApplication',
    'Kế hoạch xuất cảnh': 'catalog.milestone.departurePlan',
    'Doanh nghiệp tiếp nhận': 'catalog.milestone.clientReceived',
    'Hoàn tất thủ tục chuyển việc': 'catalog.milestone.statusChange',
    'Bổ sung hồ sơ': 'catalog.milestone.documentSupplement',
    COE: 'catalog.milestone.coeApplication',
    Visa: 'catalog.milestone.visaApplication',
    'Chuẩn bị bay': 'catalog.milestone.departurePlan',
    'Tiếp nhận': 'catalog.milestone.clientReceived',
    'Hợp đồng mới': 'catalog.milestone.contractChange',
    'Đổi tư cách': 'catalog.milestone.statusChangeInJapan',
    'Bàn giao': 'catalog.milestone.handover',
    'Hoàn tất cung ứng': 'catalog.milestone.completed'
  },
  journeyTemplate: {
    'Cung ứng nhân sự từ Việt Nam': 'catalog.template.supplyFromVietnam',
    'Chuyển việc tại Nhật': 'catalog.template.transferInJapan',
    'Cung ứng nhân sự Nhật Bản': 'templateNames.supplyToJapan',
    'Cung ứng ngành chăm sóc': 'templateNames.careSupply'
  },
  candidateNextAction: {
    'Rà soát hồ sơ': 'catalog.nextAction.review',
    'Rà soát hồ sơ import': 'catalog.nextAction.reviewImport',
    'Sàng lọc hồ sơ': 'catalog.nextAction.screen',
    'Theo dõi lịch phỏng vấn': 'catalog.nextAction.followInterview',
    'Theo dõi lộ trình cung ứng': 'catalog.nextAction.followJourney',
    'Theo dõi sau tiếp nhận': 'catalog.nextAction.followOnboarding',
    'Bổ sung hồ sơ COE': 'catalog.nextAction.supplementCoe',
    'Bổ sung số điện thoại': 'catalog.nextAction.supplementPhone',
    'Đã lưu trữ': 'catalog.nextAction.archived'
  },
  workTask: {
    'Nhập kết quả phỏng vấn': 'catalog.workTask.interviewResult',
    'Xác nhận lịch phỏng vấn': 'catalog.workTask.interviewSchedule',
    'Đọc và xử lý phản hồi ứng viên': 'catalog.workTask.emailReply',
    'Bổ sung giấy tờ trước hạn': 'catalog.workTask.documentDue'
  },
  candidateReadiness: {
    'Sẵn sàng phỏng vấn': 'candidates.table.readinessInterview',
    'Đủ hồ sơ': 'candidates.table.readinessReview',
    'Chờ rà soát': 'candidates.table.readinessReview',
    'Chưa đủ hồ sơ': 'candidates.table.readinessNotReady'
  },
  journeyEligibilityReason: {
    'Đơn ứng tuyển chưa ở trạng thái trúng tuyển.': 'systemLabels.journeyReasonNotPassed',
    'Ứng viên đang có lộ trình cung ứng hiệu lực.': 'systemLabels.journeyReasonActiveJourney'
  },
  reportMetric: {
    candidates: 'reportMetrics.candidates',
    applications: 'reportMetrics.applications',
    passed: 'reportMetrics.passed',
    journeyCompletion: 'reportMetrics.journeyCompletion',
    referral: 'reportMetrics.referral',
    manual: 'reportMetrics.manual',
    import: 'reportMetrics.import',
    activeOrders: 'reportMetrics.activeOrders',
    filledOrders: 'reportMetrics.filledOrders',
    atRiskJourneys: 'reportMetrics.atRiskJourneys',
    averageJourneyDays: 'reportMetrics.averageJourneyDays',
    replySla: 'reportMetrics.replySla',
    unmatched: 'reportMetrics.unmatched',
    overdueTasks: 'reportMetrics.overdueTasks',
    averageReplyMinutes: 'reportMetrics.averageReplyMinutes',
    missingPhone: 'reportMetrics.missingPhone',
    duplicateCandidates: 'reportMetrics.duplicateCandidates'
  },
  reportFunnelStage: {
    candidates: 'reportFunnelStages.candidates',
    applications: 'reportFunnelStages.applications',
    interviewed: 'reportFunnelStages.interviewed',
    passed: 'reportFunnelStages.passed',
    supplied: 'reportFunnelStages.supplied'
  }
} as const satisfies Record<string, Record<string, TranslationKey>>;

export type DomainLabelGroup = keyof typeof domainLabelKeys;

export function getDomainLabel(t: Translate, group: DomainLabelGroup, code: string): string {
  const key = (domainLabelKeys[group] as Record<string, TranslationKey>)[code];
  return key ? t(key) : code;
}
