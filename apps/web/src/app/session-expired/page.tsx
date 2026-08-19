'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useI18n } from '@/i18n/use-i18n';

export default function SessionExpiredPage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="max-w-md rounded-xl border border-border bg-panel p-8 text-center shadow-panel">
        <div className="flex justify-end"><LanguageSwitcher compact /></div>
        <h1 className="mt-4 text-2xl font-bold text-text">{t('auth.sessionExpired.title')}</h1>
        <p className="mt-3 text-sm text-text-muted">{t('auth.sessionExpired.description')}</p>
        <Link href="/login" className="mt-6 inline-flex min-h-10 items-center rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white">{t('auth.sessionExpired.loginAgain')}</Link>
      </section>
    </main>
  );
}
