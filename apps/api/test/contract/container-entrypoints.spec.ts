import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const compose = readFileSync(new URL('../../../../docker-compose.yml', import.meta.url), 'utf8');

function serviceBlock(name: string): string {
  const start = compose.indexOf(`  ${name}:`);
  if (start < 0) throw new Error(`service not found: ${name}`);
  const nextMatch = compose.slice(start + 3).match(/\n\s{2}[A-Za-z0-9_-]+:/);
  const next = nextMatch ? start + 3 + nextMatch.index! : compose.length;
  return compose.slice(start, next);
}

describe('container process entrypoints', () => {
  it('overrides the API image entrypoint for worker and scheduler roles', () => {
    expect(serviceBlock('worker')).toContain('profiles: ["queue"]');
    expect(serviceBlock('worker')).toContain('entrypoint: ["node"]');
    expect(serviceBlock('worker')).toContain('command: ["dist/bootstrap/worker.js"]');
    expect(serviceBlock('scheduler')).toContain('profiles: ["queue"]');
    expect(serviceBlock('scheduler')).toContain('entrypoint: ["node"]');
    expect(serviceBlock('scheduler')).toContain('command: ["dist/bootstrap/scheduler.js"]');
  });
});
