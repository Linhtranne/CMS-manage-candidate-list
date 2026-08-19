import { describe, expect, it } from 'vitest';
import { en } from './en';
import { ja } from './ja';
import { vi } from './vi';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
}

describe('locale dictionary parity', () => {
  it('keeps English and Japanese keys identical to Vietnamese', () => {
    const sourceKeys = leafKeys(vi).sort();
    expect(leafKeys(en).sort()).toEqual(sourceKeys);
    expect(leafKeys(ja).sort()).toEqual(sourceKeys);
  });
});
