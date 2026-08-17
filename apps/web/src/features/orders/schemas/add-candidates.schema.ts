import { z } from 'zod';

export const addCandidatesSchema = z.object({
  candidateIds: z.array(z.string()).min(1, 'Chọn ít nhất một ứng viên'),
  source: z.literal('MANUAL_MATCH')
});

