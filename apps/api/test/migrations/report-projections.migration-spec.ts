import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiRoot = resolve(import.meta.dirname, '../..');
const migrationPath = resolve(apiRoot, 'prisma/migrations/20260820040200_report_projections/migration.sql');
const schemaPath = resolve(apiRoot, 'prisma/schema.prisma');

describe('report projection migration contract', () => {
  it('stores scoped projection rows with a watermark and idempotent key', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    expect(schema).toContain('model ReportProjectionWatermark');
    expect(schema).toContain('model ReportProjectionRow');
    expect(migration).toMatch(/CREATE TABLE report_projection_watermarks/i);
    expect(migration).toMatch(/CREATE TABLE report_projection_rows/i);
    expect(migration).toMatch(/report_projection_rows_key UNIQUE/i);
    expect(migration).toMatch(/source_watermark timestamptz/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON report_projection_watermarks, report_projection_rows TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON report_projection_watermarks, report_projection_rows FROM cms_api/i);
  });
});

