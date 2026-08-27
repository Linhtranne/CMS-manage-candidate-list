import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('canonical backend scripts', () => {
  it('declares every release-gate command', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    for (const name of [
      'test:unit',
      'test:integration',
      'test:contract',
      'test:e2e',
      'test:migration',
      'test:security',
      'smoke:container',
      'db:query-plan-smoke',
      'release:preflight',
      'release:manifest',
    ]) {
      expect(pkg.scripts[name], name).toBeTypeOf('string');
    }
  });
});
