import { z } from 'zod';

const common = {
  scheduledAt: z.string().min(1, 'Vui lòng chọn thời gian phỏng vấn'),
  timeZone: z.string().min(1, 'Vui lòng chọn múi giờ'),
  participants: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một người tham gia')
};

export const interviewSchema = z.discriminatedUnion('mode', [
  z.object({ ...common, mode: z.literal('ONLINE'), meetingUrl: z.string().url('Đường dẫn phòng phỏng vấn không hợp lệ'), location: z.string().nullable().optional() }),
  z.object({ ...common, mode: z.literal('IN_PERSON'), meetingUrl: z.string().nullable().optional(), location: z.string().min(1, 'Vui lòng nhập địa điểm phỏng vấn') })
]);

export const rescheduleInterviewSchema = z.discriminatedUnion('mode', [
  z.object({ ...common, mode: z.literal('ONLINE'), meetingUrl: z.string().url('Đường dẫn phòng phỏng vấn không hợp lệ'), location: z.string().nullable().optional(), reason: z.string().min(1, 'Vui lòng nhập lý do đổi lịch') }),
  z.object({ ...common, mode: z.literal('IN_PERSON'), meetingUrl: z.string().nullable().optional(), location: z.string().min(1, 'Vui lòng nhập địa điểm phỏng vấn'), reason: z.string().min(1, 'Vui lòng nhập lý do đổi lịch') })
]);
