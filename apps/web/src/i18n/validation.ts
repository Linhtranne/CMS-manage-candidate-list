import type { Translate, TranslationKey } from './types';

type ValidationIssue = { message?: string };

export function translateValidationIssue(
  t: Translate,
  issue: ValidationIssue | undefined,
  fallback: TranslationKey
): string {
  const key = issue?.message;
  return key?.startsWith('validation.') ? t(key as TranslationKey) : t(fallback);
}
