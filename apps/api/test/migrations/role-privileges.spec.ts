import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('database application role', () => {
  it('creates a no-login least-privilege role and keeps audit append-only', () => {
    const sql = readFileSync(new URL('../../prisma/migrations/20260820000100_foundation/migration.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/CREATE ROLE cms_api NOLOGIN/);
    expect(sql).toMatch(/ALTER ROLE cms_api NOLOGIN/);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON audit_events TO cms_api/);
    expect(sql).toMatch(/REVOKE UPDATE, DELETE ON audit_events FROM cms_api/);
  });
});
