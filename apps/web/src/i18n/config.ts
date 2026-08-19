export const LOCALES = ['vi', 'en', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_COOKIE = 'cms_locale';
export const LOCALE_COOKIE_MAX_AGE = 31_536_000;

export const INTL_LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP'
} as const satisfies Record<Locale, string>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}
