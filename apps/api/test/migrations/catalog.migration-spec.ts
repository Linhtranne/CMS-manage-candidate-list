import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiRoot = resolve(import.meta.dirname, '../..');
const migrationPath = resolve(apiRoot, 'prisma/migrations/20260820010100_catalog/migration.sql');
const schemaPath = resolve(apiRoot, 'prisma/schema.prisma');

describe('catalog migration contract', () => {
  it('defines versioned catalog and question-template storage with database constraints', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    for (const model of ['CatalogItem', 'CatalogVersion', 'InterviewQuestionTemplate', 'InterviewQuestionTemplateVersion']) {
      expect(schema).toContain(`model ${model}`);
    }
    for (const table of ['catalog_items', 'catalog_versions', 'interview_question_templates', 'interview_question_template_versions']) {
      expect(migration).toMatch(new RegExp(`CREATE TABLE ${table}\\b`, 'i'));
    }
    expect(migration).toMatch(/UNIQUE INDEX catalog_versions_one_active_idx/i);
    expect(migration).toMatch(/UNIQUE INDEX interview_question_template_versions_one_active_idx/i);
    expect(migration).toMatch(/status IN \('DRAFT', 'ACTIVE', 'RETIRED'\)/i);
    expect(migration).toMatch(/jsonb_typeof\(questions\) = 'array'/i);
  });

  it('protects active versions and prevents application-role deletes', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toMatch(/catalog_versions_active_immutable/i);
    expect(migration).toMatch(/interview_question_template_versions_active_immutable/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON catalog_items, catalog_versions, interview_question_templates, interview_question_template_versions TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON catalog_items, catalog_versions, interview_question_templates, interview_question_template_versions FROM cms_api/i);
  });
});
