import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, INTL_LOCALES, isLocale } from './config';
import { createTranslator, translateMessage } from './translate';

describe('locale configuration', () => {
  it('accepts only the three supported locales', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ja')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('uses Vietnamese as the default and maps each locale to Intl', () => {
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(INTL_LOCALES).toEqual({ vi: 'vi-VN', en: 'en-US', ja: 'ja-JP' });
  });
});

describe('createTranslator', () => {
  it('translates the same key in Vietnamese, English and Japanese', () => {
    expect(createTranslator('vi')('common.actions.save')).toBe('Lưu');
    expect(createTranslator('en')('common.actions.save')).toBe('Save');
    expect(createTranslator('ja')('common.actions.save')).toBe('保存');
  });

  it('interpolates named values without concatenating translated fragments', () => {
    expect(createTranslator('en')('common.greeting', { name: 'An' })).toBe('Hello, An');
    expect(createTranslator('ja')('common.greeting', { name: 'An' })).toBe('Anさん、こんにちは');
  });

  it('selects plural messages using the active locale', () => {
    expect(createTranslator('en')('common.files', { count: 1 })).toBe('1 file');
    expect(createTranslator('en')('common.files', { count: 2 })).toBe('2 files');
    expect(createTranslator('ja')('common.files', { count: 2 })).toBe('2 件のファイル');
  });

  it('falls back to Vietnamese when a runtime locale entry is missing', () => {
    expect(translateMessage(
      'common.fallbackOnly',
      { common: {} },
      { common: { fallbackOnly: 'Nội dung dự phòng' } }
    )).toBe('Nội dung dự phòng');
  });
});
