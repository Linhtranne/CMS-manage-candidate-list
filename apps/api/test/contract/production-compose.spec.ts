import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const compose = readFileSync(new URL('../../../../docker-compose.prod.yml', import.meta.url), 'utf8');

describe('production compose contract', () => {
  it('requires immutable API, migration and web images', () => {
    expect(compose).toContain('image: ${API_IMAGE:?API_IMAGE must be set for production}');
    expect(compose).toContain('image: ${MIGRATION_IMAGE:?MIGRATION_IMAGE must be set for production}');
    expect(compose).toContain('image: ${WEB_IMAGE:?WEB_IMAGE must be set for production}');
  });

  it('removes local build instructions from production services', () => {
    expect(compose.match(/build: !reset null/g)?.length).toBe(5);
  });
});
