import type { Translate } from './types';

/**
 * API errors are data, not presentation copy. The backend may return a
 * Vietnamese message in the mock adapter (or an untranslated message in a
 * future integration), so UI surfaces must render a locale-owned fallback.
 * Error codes can be wired to more specific translation keys later without
 * allowing a raw server message to leak into another locale.
 */
export function localizedError(t: Translate, _error: unknown, fallback: string): string {
  return fallback || t('common.errors.loadFailed');
}
