import { describe, expect, it } from 'vitest';
import { emailStatusLabel } from './email-status-label';

describe('emailStatusLabel', () => {
  it.each([
    ['QUEUED', 'Đang chờ gửi'],
    ['SENT', 'Đã gửi'],
    ['BOUNCED', 'Bị trả lại'],
    ['RECEIVED', 'Đã nhận']
  ])('maps %s to explicit Vietnamese text', (status, label) => {
    expect(emailStatusLabel(status as never)).toBe(label);
  });
});
