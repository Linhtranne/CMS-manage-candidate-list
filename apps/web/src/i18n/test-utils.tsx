import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Locale } from './config';
import { I18nProvider } from './provider';

export function renderWithI18n(ui: ReactElement, locale: Locale = 'vi', options?: Omit<RenderOptions, 'wrapper'>) {
  return render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>, options);
}
