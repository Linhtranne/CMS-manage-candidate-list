'use client';

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { INTL_LOCALES, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from './config';
import { createTranslator } from './translate';
import type { Translate } from './types';

type DateInput = Date | number | string;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
  formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: DateInput, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const intlLocale = INTL_LOCALES[locale];

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: createTranslator(locale),
    formatDate: (input, options) => new Intl.DateTimeFormat(intlLocale, options).format(toDate(input)),
    formatDateTime: (input, options) => new Intl.DateTimeFormat(intlLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(toDate(input)),
    formatTime: (input, options) => new Intl.DateTimeFormat(intlLocale, {
      timeStyle: 'short',
      ...options
    }).format(toDate(input)),
    formatNumber: (input, options) => new Intl.NumberFormat(intlLocale, options).format(input),
    formatPercent: (input, options) => new Intl.NumberFormat(intlLocale, {
      style: 'percent',
      ...options
    }).format(input)
  }), [intlLocale, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
