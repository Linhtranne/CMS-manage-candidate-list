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
import './globals.css';

export const metadata: Metadata = {
  title: 'Candidate Supply CMS',
  description: 'CMS nội bộ quản lý tuyển dụng và cung ứng nhân sự sang Nhật'
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body><I18nProvider initialLocale={locale}><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-panel focus:px-4 focus:py-3 focus:text-accent focus:shadow-panel">Bỏ qua đến nội dung chính</a>{children}</I18nProvider></body>
    </html>
  );
}
