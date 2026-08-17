import type { components } from '@cms/contracts';

export type JobOrder = components['schemas']['JobOrder'];
export const orderFixtures: JobOrder[] = [
  { id: 'order-01', code: 'ORD-IT-01', position: 'Kỹ sư phần mềm', client: { id: 'client-01', name: 'Sakura Tech Solutions' }, industryLabel: 'Công nghệ thông tin', occupation: 'Phát triển phần mềm', location: 'Tokyo', target: 8, deadline: '2026-09-20T00:00:00.000Z', owner: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, status: 'RECRUITING', metrics: { target: 8, activeApplications: 5, passed: 2, supplied: 1 }, health: 'UNDER_TARGET', version: 1, salary: '280.000–360.000 yên/tháng', contractType: 'Kỹ năng đặc định', japaneseLevel: 'N3', criteria: ['TypeScript hoặc Java', 'Kinh nghiệm 2 năm', 'Có thể làm việc tại Tokyo'] },
  { id: 'order-02', code: 'ORD-MECH-01', position: 'Kỹ thuật viên cơ khí', client: { id: 'client-02', name: 'Sakura Care Partners' }, industryLabel: 'Cơ khí', occupation: 'Gia công cơ khí', location: 'Aichi', target: 20, deadline: '2026-10-12T00:00:00.000Z', owner: { id: 'u-manager', name: 'Lê Thu Hà' }, status: 'RECRUITING', metrics: { target: 20, activeApplications: 12, passed: 5, supplied: 2 }, health: 'INTERVIEW_DELAY', version: 2, salary: '250.000–320.000 yên/tháng', contractType: 'Thực tập kỹ năng', japaneseLevel: 'N4', criteria: ['Đọc bản vẽ', 'Sức khỏe tốt', 'Có kinh nghiệm xưởng'] },
  { id: 'order-03', code: 'ORD-CARE-01', position: 'Điều dưỡng', client: { id: 'client-03', name: 'Hikari Medical Group' }, industryLabel: 'Điều dưỡng', occupation: 'Chăm sóc người cao tuổi', location: 'Fukuoka', target: 10, deadline: '2026-08-28T00:00:00.000Z', owner: { id: 'u-coordinator', name: 'Trần Quốc Huy' }, status: 'RECRUITING', metrics: { target: 10, activeApplications: 7, passed: 3, supplied: 0 }, health: 'EXPIRING', version: 1, salary: '210.000–280.000 yên/tháng', contractType: 'Kỹ năng đặc định', japaneseLevel: 'N3', criteria: ['Chứng chỉ điều dưỡng', 'Kinh nghiệm chăm sóc', 'Làm việc theo ca'] }
];

export const candidateMatchFixtures: components['schemas']['CandidateMatch'][] = [
  { id: 'candidate-01', code: 'UV-0001', name: 'Nguyễn Minh An', industryLabel: 'Công nghệ thông tin', occupation: 'Phát triển phần mềm', japaneseLevel: 'N3', readiness: 'Sẵn sàng phỏng vấn', hasActiveApplicationInOrder: true, hasActiveJourney: false },
  { id: 'candidate-05', code: 'UV-0005', name: 'Võ Thanh Tùng', industryLabel: 'Công nghệ thông tin', occupation: 'QA Engineer', japaneseLevel: 'N3', readiness: 'Đủ hồ sơ', hasActiveApplicationInOrder: false, hasActiveJourney: true },
  { id: 'candidate-06', code: 'UV-0006', name: 'Đỗ Mai Lan', industryLabel: 'Công nghệ thông tin', occupation: 'Frontend Developer', japaneseLevel: 'N2', readiness: 'Đủ hồ sơ', hasActiveApplicationInOrder: false, hasActiveJourney: false }
];

