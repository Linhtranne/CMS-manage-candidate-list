import type { WorkItem, WorkSummary } from '@/features/work/types';

const today = new Date();
const iso = (hours: number) => new Date(today.getTime() + hours * 3_600_000).toISOString();

export const workFixtures: WorkItem[] = [
  {
    id: 'work-overdue-01', title: 'Nhập kết quả phỏng vấn', priority: 'URGENT', status: 'TODO', dueAt: iso(-26),
    assignee: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, sourceType: 'INTERVIEW_RESULT_DUE', sourceLabel: 'Chưa nhập kết quả phỏng vấn',
    candidate: { id: 'candidate-01', code: 'UV-0001', name: 'Nguyễn Minh An' }, order: { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm' },
    client: { id: 'client-01', name: 'Sakura Tech Solutions' }, updatedAt: iso(-2), version: 1, lastActivity: 'Ứng viên đã phỏng vấn lúc 09:30 hôm qua', notes: 'Kiểm tra form đánh giá trước khi gửi khách hàng.'
  },
  {
    id: 'work-today-01', title: 'Xác nhận lịch phỏng vấn', priority: 'HIGH', status: 'IN_PROGRESS', dueAt: iso(4),
    assignee: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, sourceType: 'INTERVIEW_SCHEDULED', sourceLabel: 'Phỏng vấn hôm nay',
    candidate: { id: 'candidate-02', code: 'UV-0002', name: 'Trần Minh Khoa' }, order: { id: 'order-02', code: 'ORD-MECH-01', position: 'Kỹ thuật viên cơ khí' },
    client: { id: 'client-02', name: 'Sakura Care Partners' }, updatedAt: iso(-1), version: 2, lastActivity: 'Đã gửi email xác nhận cho ứng viên'
  },
  {
    id: 'work-reply-01', title: 'Đọc và xử lý phản hồi ứng viên', priority: 'NORMAL', status: 'WAITING_REPLY', dueAt: iso(20),
    assignee: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, sourceType: 'CANDIDATE_EMAIL_REPLY', sourceLabel: 'Ứng viên vừa phản hồi email',
    candidate: { id: 'candidate-03', code: 'UV-0003', name: 'Lê Thu Hà' }, order: { id: 'order-03', code: 'ORD-CARE-01', position: 'Điều dưỡng' },
    client: { id: 'client-03', name: 'Hikari Medical Group' }, updatedAt: iso(-5), version: 1, lastActivity: 'Ứng viên gửi 2 tệp đính kèm'
  },
  {
    id: 'work-milestone-01', title: 'Bổ sung giấy tờ trước hạn', priority: 'HIGH', status: 'TODO', dueAt: iso(48),
    assignee: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, sourceType: 'MILESTONE_BLOCKED', sourceLabel: 'Milestone cung ứng đang bị chặn',
    candidate: { id: 'candidate-04', code: 'UV-0004', name: 'Phạm Đức Long' }, order: { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm' },
    client: { id: 'client-01', name: 'Sakura Tech Solutions' }, updatedAt: iso(-8), version: 1, lastActivity: 'Thiếu bản scan hộ chiếu'
  }
];

export const workSummaryFixture: WorkSummary = { overdue: 3, today: 4, waitingReply: 5, unresolvedEmail: 2, journeyRisk: 1 };

