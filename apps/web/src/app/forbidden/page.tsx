'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useI18n } from '@/i18n/use-i18n';

export default function ForbiddenPage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="max-w-md rounded-xl border border-border bg-panel p-8 text-center shadow-panel">
        <div className="flex justify-end"><LanguageSwitcher compact /></div>
        <h1 className="mt-4 text-2xl font-bold text-text">{t('auth.forbidden.title')}</h1>
        <p className="mt-3 text-sm text-text-muted">{t('auth.forbidden.description')}</p>
        <Link href="/work" className="mt-6 inline-flex min-h-10 items-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-text">{t('auth.forbidden.backToWork')}</Link>
      </section>
    </main>
  );
}
