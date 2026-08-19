import type { Locale } from './config';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { vi } from './locales/vi';
import type { MessageDictionary, Translate, TranslationKey, TranslationParams } from './types';

const dictionaries = { vi, en, ja } as const;

function findMessage(dictionary: MessageDictionary, key: string): unknown {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, dictionary);
}

function interpolate(message: string, params: TranslationParams): string {
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

function resolvePlural(message: unknown, params: TranslationParams, locale: Locale): unknown {
  if (!message || typeof message !== 'object' || !('other' in message)) return message;
  const count = params.count;
  if (typeof count !== 'number') return (message as Record<string, unknown>).other;
  const category = new Intl.PluralRules(locale).select(count);
  const messages = message as Record<string, unknown>;
  return messages[category] ?? messages.other;
}

export function translateMessage(
  key: TranslationKey,
  dictionary: MessageDictionary,
  fallbackDictionary: MessageDictionary,
  params: TranslationParams = {},
  locale: Locale = 'vi'
): string {
  const rawMessage = findMessage(dictionary, key) ?? findMessage(fallbackDictionary, key);
  const message = resolvePlural(rawMessage, params, locale);
  if (typeof message !== 'string') {
    if (process.env.NODE_ENV !== 'production') throw new Error(`Missing translation: ${key}`);
    return key;
  }
  return interpolate(message, params);
}

export function createTranslator(locale: Locale): Translate {
  return (key, params) => translateMessage(key, dictionaries[locale], dictionaries.vi, params, locale);
}
