import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiRoot = resolve(import.meta.dirname, '../..');
const migrationPath = resolve(apiRoot, 'prisma/migrations/20260820000100_foundation/migration.sql');
const schemaPath = resolve(apiRoot, 'prisma/schema.prisma');
const nMinusOneFixturePath = resolve(apiRoot, 'test/migrations/fixtures/n-1-user.sql');

describe('foundation migration contract', () => {
  it('defines the Prisma schema and immutable migration artifact', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');

    for (const model of ['User', 'IdentityLink', 'Session', 'AuditEvent', 'OutboxEvent', 'JobAttempt']) {
      expect(schema, `missing Prisma model ${model}`).toContain(`model ${model}`);
    }
    for (const table of ['users', 'identity_links', 'sessions', 'audit_events', 'outbox_events', 'job_attempts']) {
      expect(migration, `missing table ${table}`).toMatch(new RegExp(`CREATE TABLE ${table}\\b`, 'i'));
    }
    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|SCHEMA)/i);
  });

  it('protects audit append-only semantics and outbox/job delivery indexes', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toMatch(/CREATE TRIGGER audit_events_append_only/i);
    expect(migration).toMatch(/REVOKE\s+UPDATE,\s*DELETE\s+ON\s+audit_events/i);
    expect(migration).toMatch(/outbox_events_pending_idx/i);
    expect(migration).toMatch(/job_attempts_retry_idx/i);
    expect(migration).toMatch(/UNIQUE\s*\(idempotency_key\)/i);
    expect(migration).toMatch(/schema_version/i);
  });

  it('keeps the migration forward-compatible for an N-1 application', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    const nMinusOneFixture = readFileSync(nMinusOneFixturePath, 'utf8');

    expect(migration).toMatch(/ADD\s+CONSTRAINT/i);
    expect(migration).toMatch(/IF NOT EXISTS/i);
    expect(migration).not.toMatch(/ALTER TABLE[\s\S]{0,250}\bDROP\b/i);
    expect(nMinusOneFixture).toContain('INSERT INTO users (display_name, email, status)');
    expect(migration).toContain('display_name varchar(160) NOT NULL');
    expect(migration).toContain('email varchar(320) NOT NULL');
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)('runs the migration smoke hook against an explicit test database', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'",
      );
      expect(result.rows).toHaveLength(1);
    } finally {
      await client.end();
    }
  });
});
