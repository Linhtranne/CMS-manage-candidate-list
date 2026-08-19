'use client';

import { LOCALES, type Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/use-i18n';

const labels: Record<Locale, string> = {
  vi: 'VI',
  en: 'EN',
  ja: '日本語'
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      aria-label={t('common.language.label')}
      value={locale}
      onChange={(event) => setLocale(event.target.value as Locale)}
      className={compact
        ? 'h-10 shrink-0 rounded-control border border-border bg-panel px-2 text-sm font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        : 'min-h-11 rounded-control border border-border bg-panel px-3 text-sm font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'}
    >
      {LOCALES.map((value) => <option key={value} value={value}>{labels[value]}</option>)}
    </select>
  );
}
