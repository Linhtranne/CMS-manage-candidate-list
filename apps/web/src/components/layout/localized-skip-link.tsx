'use client';

import { useI18n } from '@/i18n/use-i18n';

export function LocalizedSkipLink() {
  const { t } = useI18n();
  return <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-panel focus:px-4 focus:py-3 focus:text-accent focus:shadow-panel">{t('common.a11y.skipToContent')}</a>;
}
