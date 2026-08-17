import { z } from 'zod';

export const interviewResultSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  feedback: z.string().min(1, 'Vui lòng nhập nhận xét phỏng vấn').max(5000, 'Nhận xét không vượt quá 5.000 ký tự'),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  nextStep: z.string().nullable().optional(),
  recordedAt: z.string().min(1, 'Thiếu thời gian ghi nhận'),
  version: z.number().int().nonnegative()
});
