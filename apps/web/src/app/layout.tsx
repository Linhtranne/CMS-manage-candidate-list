import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/600.css';
import '@fontsource/noto-sans-jp/700.css';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/i18n/config';
import { I18nProvider } from '@/i18n/provider';
import { createLocalizedMetadata } from '@/i18n/metadata';
import { LocalizedSkipLink } from '@/components/layout/localized-skip-link';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  return createLocalizedMetadata(isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE);
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body><I18nProvider initialLocale={locale}><LocalizedSkipLink />{children}</I18nProvider></body>
    </html>
  );
}
