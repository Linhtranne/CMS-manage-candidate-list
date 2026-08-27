import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function migration(name: string): string { return readFileSync(resolve(process.cwd(), 'prisma', 'migrations', name, 'migration.sql'), 'utf8'); }

describe('Phase 1A migration contract', () => {
  it('keeps import/duplicate/merge tables bounded and append-safe', () => {
    const sql = migration('20260820010400_candidate_import_merge');
    expect(sql).toMatch(/CREATE TABLE candidate_import_batches/i);
    expect(sql).toMatch(/candidate_import_row_unique/i);
    expect(sql).toMatch(/candidate_duplicate_cases/i);
    expect(sql).toMatch(/candidate_merge_aliases/i);
    expect(sql).toMatch(/REVOKE DELETE ON candidate_import_batches/i);
  });

  it('enforces one active application and immutable interview round identity', () => {
    const applications = migration('20260820010500_applications');
    const interviews = migration('20260820010600_interviews');
    expect(applications).toMatch(/applications_active_candidate_order_unique/i);
    expect(applications).toMatch(/status NOT IN \('PASSED', 'FAILED', 'WITHDRAWN'\)/i);
    expect(interviews).toMatch(/interviews_application_round_unique/i);
    expect(interviews).toMatch(/interviews_schedule_range/i);
    expect(interviews).toMatch(/REVOKE DELETE ON interviews/i);
  });
});
