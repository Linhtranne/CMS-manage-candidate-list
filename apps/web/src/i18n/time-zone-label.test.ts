import { describe, expect, it } from 'vitest';
import { createTranslator } from './translate';
import { timeZoneLabel } from './time-zone-label';

describe('timeZoneLabel', () => {
  it('translates known IANA zones', () => {
    expect(timeZoneLabel(createTranslator('vi'), 'Asia/Ho_Chi_Minh')).toBe('GMT+7 · Việt Nam');
    expect(timeZoneLabel(createTranslator('en'), 'Asia/Tokyo')).toBe('GMT+9 · Japan');
    expect(timeZoneLabel(createTranslator('ja'), 'UTC')).toBe('UTC');
  });

  it('preserves an unknown configured zone for troubleshooting', () => {
    expect(timeZoneLabel(createTranslator('vi'), 'Europe/London')).toBe('Europe/London');
  });
});
