import { z } from 'zod';

export const interviewResultSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  feedback: z.string().min(1, 'validation.interviewResult.feedback').max(5000, 'validation.interviewResult.feedbackTooLong'),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  nextStep: z.string().nullable().optional(),
  recordedAt: z.string().min(1, 'validation.interviewResult.recordedAt'),
  version: z.number().int().nonnegative()
});
