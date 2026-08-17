import { z } from 'zod';

export const milestoneSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'WAIVED', 'NOT_APPLICABLE']),
  blockerParty: z.enum(['CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'OTHER']).nullable().optional(),
  blockerReason: z.string().nullable().optional(),
  naReason: z.string().nullable().optional(),
  evidenceIds: z.array(z.string()),
  version: z.number().int().nonnegative()
});

export const waiverSchema = z.object({ reason: z.string().min(1, 'Vui lòng nhập lý do miễn trừ'), approverId: z.string().min(1, 'Vui lòng chọn người duyệt'), evidenceIds: z.array(z.string()), version: z.number().int().nonnegative() });
