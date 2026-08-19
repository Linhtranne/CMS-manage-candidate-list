import type { Metadata } from 'next';
import type { Locale } from './config';
import { createTranslator } from './translate';

export function createLocalizedMetadata(locale: Locale): Metadata {
  const t = createTranslator(locale);
  return {
    title: t('common.brand.cmsName'),
    description: t('common.metadata.description')
  };
}
