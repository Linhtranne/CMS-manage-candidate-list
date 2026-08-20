import { z } from 'zod';

const common = {
  scheduledAt: z.string().min(1, 'validation.interview.scheduledAt'),
  timeZone: z.string().min(1, 'validation.interview.timeZone'),
  participants: z.array(z.string()).min(1, 'validation.interview.participants')
};

export const interviewSchema = z.discriminatedUnion('mode', [
  z.object({ ...common, mode: z.literal('ONLINE'), meetingUrl: z.string().url('validation.interview.invalidUrl'), location: z.string().nullable().optional() }),
  z.object({ ...common, mode: z.literal('IN_PERSON'), meetingUrl: z.string().nullable().optional(), location: z.string().min(1, 'validation.interview.location') })
]);

export const rescheduleInterviewSchema = z.discriminatedUnion('mode', [
  z.object({ ...common, mode: z.literal('ONLINE'), meetingUrl: z.string().url('validation.interview.invalidUrl'), location: z.string().nullable().optional(), reason: z.string().min(1, 'validation.interview.rescheduleReason') }),
  z.object({ ...common, mode: z.literal('IN_PERSON'), meetingUrl: z.string().nullable().optional(), location: z.string().min(1, 'validation.interview.location'), reason: z.string().min(1, 'validation.interview.rescheduleReason') })
]);
