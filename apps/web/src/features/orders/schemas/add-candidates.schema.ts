import { z } from 'zod';

export const addCandidatesSchema = z.object({
  candidateIds: z.array(z.string()).min(1, 'validation.orders.candidateRequired'),
  source: z.literal('MANUAL_MATCH')
});

