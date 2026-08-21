import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiRoot = resolve(import.meta.dirname, '../..');

describe('candidate migration contract', () => {
  it('defines one-person candidate storage and multi-occupation profiles', () => {
    const schema = readFileSync(resolve(apiRoot, 'prisma/schema.prisma'), 'utf8');
    const migration = readFileSync(resolve(apiRoot, 'prisma/migrations/20260820010300_candidates/migration.sql'), 'utf8');
    expect(schema).toContain('model Candidate {');
    expect(schema).toContain('model CandidateOccupationProfile {');
    for (const table of ['candidates', 'candidate_occupation_profiles']) expect(migration).toMatch(new RegExp(`CREATE TABLE ${table}\\b`, 'i'));
    for (const check of ['candidates_record_status_check', 'candidates_readiness_status_check', 'candidates_contactability_status_check', 'candidate_profiles_attributes_object']) expect(migration).toContain(check);
  });

  it('protects exact passport duplicates and denies application deletes', () => {
    const migration = readFileSync(resolve(apiRoot, 'prisma/migrations/20260820010300_candidates/migration.sql'), 'utf8');
    expect(migration).toMatch(/CREATE UNIQUE INDEX candidates_passport_blind_unique/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON candidates, candidate_occupation_profiles TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON candidates, candidate_occupation_profiles FROM cms_api/i);
  });
});
