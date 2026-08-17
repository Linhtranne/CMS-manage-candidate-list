import type { components } from '@cms/contracts';

export type Client = components['schemas']['Client'];
export const clientFixtures: Client[] = [
  { id: 'client-01', code: 'KH-001', name: 'Sakura Tech Solutions', organizationType: 'Doanh nghiệp tiếp nhận', industryLabels: ['Công nghệ thông tin'], owner: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, activeOrders: 2, target: 12, passed: 5, lastActivity: '2026-08-13T08:00:00.000Z', status: 'ACTIVE', region: 'Tokyo', contactName: 'Yuki Tanaka', notes: 'Đầu mối tiếp nhận kỹ sư phần mềm.' },
  { id: 'client-02', code: 'KH-002', name: 'Sakura Care Partners', organizationType: 'Nghiệp đoàn / tổ chức giám sát', industryLabels: ['Điều dưỡng'], owner: { id: 'u-manager', name: 'Lê Thu Hà' }, activeOrders: 1, target: 20, passed: 8, lastActivity: '2026-08-12T04:30:00.000Z', status: 'ACTIVE', region: 'Osaka', contactName: 'Mika Sato', notes: 'Theo dõi lịch phỏng vấn theo tuần.' },
  { id: 'client-03', code: 'KH-003', name: 'Hikari Medical Group', organizationType: 'Đối tác tuyển dụng', industryLabels: ['Điều dưỡng', 'Chăm sóc sức khỏe'], owner: { id: 'u-coordinator', name: 'Trần Quốc Huy' }, activeOrders: 1, target: 10, passed: 3, lastActivity: '2026-08-10T02:00:00.000Z', status: 'PROSPECT', region: 'Fukuoka', contactName: 'Kenji Mori', notes: 'Đang hoàn thiện tiêu chí nghề.' }
];

