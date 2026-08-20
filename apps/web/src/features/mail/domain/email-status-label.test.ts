import { describe, expect, it } from 'vitest';
import { emailStatusLabel } from './email-status-label';
import { createTranslator } from '@/i18n/translate';

describe('emailStatusLabel', () => {
  it.each([
    ['QUEUED', 'Đang chờ gửi'],
    ['SENT', 'Đã gửi'],
    ['BOUNCED', 'Bị trả lại'],
    ['RECEIVED', 'Đã nhận']
  ])('maps %s to explicit Vietnamese text', (status, label) => {
    expect(emailStatusLabel(status as never)).toBe(label);
  });

  it('uses the active locale for email and conversation statuses', async () => {
    const { conversationStatusLabel } = await import('./email-status-label');
    expect(emailStatusLabel('SENT', createTranslator('ja'))).toBe('送信済み');
    expect(conversationStatusLabel('NEEDS_ACTION', createTranslator('en'))).toBe('Needs action');
  });
});
