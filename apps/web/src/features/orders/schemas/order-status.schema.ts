import { z } from 'zod';

export const closeOrderSchema = z.object({
  status: z.literal('CLOSED'),
  reasonCode: z.string().min(1, 'Vui lòng chọn lý do đóng đơn'),
  note: z.string().max(1000).optional(),
  version: z.number().int().nonnegative()
});

