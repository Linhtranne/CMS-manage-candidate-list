import type { components } from '@cms/contracts';

type ReportMetric = components['schemas']['ReportMetric'];
type ReportSummary = components['schemas']['ReportSummary'];

const asOf = '2026-08-17T09:00:00+07:00';

export const reportFiltersFixture: components['schemas']['ReportFilters'] = {
  from: '2026-08-01',
  to: '2026-08-17',
  teamId: null,
  ownerId: null,
  clientId: null,
  orderId: null,
  industryId: null,
  sourceId: null,
  timeZone: 'Asia/Ho_Chi_Minh'
};

const metric = (input: Omit<ReportMetric, 'asOf'>): ReportMetric => ({ ...input, asOf });

export const reportSummaryFixture: ReportSummary = {
  filters: reportFiltersFixture,
  asOf,
  metrics: [
    metric({ key: 'candidates', label: 'Ứng viên trong kỳ', value: 74, unit: 'COUNT', drilldownHref: '/candidates?view=all' }),
    metric({ key: 'applications', label: 'Đơn ứng tuyển', value: 60, unit: 'COUNT', drilldownHref: '/applications?view=all' }),
    metric({ key: 'passed', label: 'Trúng tuyển', value: 0.3, numerator: 18, denominator: 60, unit: 'PERCENT', drilldownHref: '/applications?view=passed' }),
    metric({ key: 'journeyCompletion', label: 'Hoàn tất cung ứng', value: 0.5, numerator: 6, denominator: 12, unit: 'PERCENT', drilldownHref: '/supply-journeys?view=completed' })
  ],
  sourceQuality: [
    metric({ key: 'referral', label: 'Giới thiệu nội bộ', value: 0.42, numerator: 10, denominator: 24, unit: 'PERCENT', drilldownHref: '/applications?source=REFERRAL' }),
    metric({ key: 'manual', label: 'Tìm kiếm thủ công', value: 0.28, numerator: 5, denominator: 18, unit: 'PERCENT', drilldownHref: '/applications?source=MANUAL_MATCH' }),
    metric({ key: 'import', label: 'Import dữ liệu', value: 0.17, numerator: 3, denominator: 18, unit: 'PERCENT', drilldownHref: '/applications?source=IMPORT' })
  ],
  clients: [
    metric({ key: 'activeOrders', label: 'Đơn đang tuyển', value: 11, unit: 'COUNT', drilldownHref: '/orders?status=RECRUITING' }),
    metric({ key: 'filledOrders', label: 'Đơn đã đủ người', value: 4, unit: 'COUNT', drilldownHref: '/orders?status=FILLED' })
  ],
  journeys: [
    metric({ key: 'atRiskJourneys', label: 'Lộ trình có rủi ro', value: 3, unit: 'COUNT', drilldownHref: '/supply-journeys?view=at-risk' }),
    metric({ key: 'averageJourneyDays', label: 'Thời gian cung ứng trung bình', value: 38, unit: 'DAYS', drilldownHref: '/supply-journeys?view=all' })
  ],
  mailbox: [
    metric({ key: 'replySla', label: 'Reply trong SLA', value: 0.86, numerator: 43, denominator: 50, unit: 'PERCENT', drilldownHref: '/mailbox?view=needs-action' }),
    metric({ key: 'unmatched', label: 'Email chưa ghép', value: 2, unit: 'COUNT', drilldownHref: '/mailbox?view=unmatched' })
  ],
  workload: [
    metric({ key: 'overdueTasks', label: 'Công việc quá hạn', value: 5, unit: 'COUNT', drilldownHref: '/work?view=overdue' }),
    metric({ key: 'averageReplyMinutes', label: 'Thời gian phản hồi trung bình', value: 94, unit: 'MINUTES', drilldownHref: '/mailbox?view=needs-action' })
  ],
  dataQuality: [
    metric({ key: 'missingPhone', label: 'Thiếu số điện thoại', value: 7, unit: 'COUNT', drilldownHref: '/candidates?view=missing-contact' }),
    metric({ key: 'duplicateCandidates', label: 'Ứng viên nghi trùng', value: 3, unit: 'COUNT', drilldownHref: '/candidates?view=duplicates' })
  ]
};

export const reportFunnelFixture: components['schemas']['ReportFunnelResponse'] = {
  asOf,
  timeZone: 'Asia/Ho_Chi_Minh',
  stages: [
    { key: 'candidates', label: 'Ứng viên tiềm năng', numerator: 74, denominator: 74, rate: 1, drilldownHref: '/candidates?view=all' },
    { key: 'applications', label: 'Đơn ứng tuyển', numerator: 60, denominator: 74, rate: 60 / 74, drilldownHref: '/applications?view=all' },
    { key: 'interviewed', label: 'Đã phỏng vấn', numerator: 38, denominator: 60, rate: 38 / 60, drilldownHref: '/applications?view=interviewed' },
    { key: 'passed', label: 'Trúng tuyển', numerator: 18, denominator: 60, rate: 0.3, drilldownHref: '/applications?view=passed' },
    { key: 'supplied', label: 'Đã hoàn tất cung ứng', numerator: 6, denominator: 18, rate: 1 / 3, drilldownHref: '/supply-journeys?view=completed' }
  ]
};

export const reportExportJobs = new Map<string, components['schemas']['ReportExportJob']>();
