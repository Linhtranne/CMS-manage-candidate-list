import { describe, expect, it } from 'vitest';
import { en } from './en';
import { ja } from './ja';
import { vi } from './vi';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
}

function emptyLeafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return value.trim() ? [] : [prefix];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => emptyLeafKeys(child, prefix ? `${prefix}.${key}` : key));
}

const preservedIdentityKeys = ['adminExtraNames.', 'journeys.milestone.approvers.'];
const vietnameseCharacters = /[À-ỹ]/;

function untranslatedVietnameseKeys(base: Record<string, unknown>, target: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(base).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const targetValue = target[key];
    if (typeof value === 'string') {
      const isPreservedIdentity = preservedIdentityKeys.some((allowedPrefix) => path.startsWith(allowedPrefix));
      return value === targetValue && vietnameseCharacters.test(value) && !isPreservedIdentity ? [path] : [];
    }
    if (value && typeof value === 'object' && targetValue && typeof targetValue === 'object') {
      return untranslatedVietnameseKeys(value as Record<string, unknown>, targetValue as Record<string, unknown>, path);
    }
    return [];
  });
}

describe('locale dictionary parity', () => {
  it('keeps English and Japanese keys identical to Vietnamese', () => {
    const sourceKeys = leafKeys(vi).sort();
    expect(leafKeys(en).sort()).toEqual(sourceKeys);
    expect(leafKeys(ja).sort()).toEqual(sourceKeys);
  });

  it('does not leave blank messages in any locale', () => {
    expect(emptyLeafKeys(vi)).toEqual([]);
    expect(emptyLeafKeys(en)).toEqual([]);
    expect(emptyLeafKeys(ja)).toEqual([]);
  });

  it('does not leak Vietnamese UI copy into English or Japanese', () => {
    expect(untranslatedVietnameseKeys(vi, en)).toEqual([]);
    expect(untranslatedVietnameseKeys(vi, ja)).toEqual([]);
  });
});
