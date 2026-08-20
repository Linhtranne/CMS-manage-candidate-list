'use client';

import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './provider';
import { createTranslator } from './translate';

const testFallback: I18nContextValue = {
  locale: 'vi',
  setLocale: () => undefined,
  t: createTranslator('vi'),
  formatDate: (value, options) => new Intl.DateTimeFormat('vi-VN', options).format(value instanceof Date ? value : new Date(value)),
  formatDateTime: (value, options) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', ...options }).format(value instanceof Date ? value : new Date(value)),
  formatTime: (value, options) => new Intl.DateTimeFormat('vi-VN', { timeStyle: 'short', ...options }).format(value instanceof Date ? value : new Date(value)),
  formatNumber: (value, options) => new Intl.NumberFormat('vi-VN', options).format(value),
  formatPercent: (value, options) => new Intl.NumberFormat('vi-VN', { style: 'percent', ...options }).format(value)
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    if (process.env.NODE_ENV === 'test') return testFallback;
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
