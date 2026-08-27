import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiRoot = resolve(import.meta.dirname, '../..');
const migrationPath = resolve(apiRoot, 'prisma/migrations/20260820040100_tasks_rules/migration.sql');
const schemaPath = resolve(apiRoot, 'prisma/schema.prisma');

describe('tasks and rule migration contract', () => {
  it('defines deterministic task/rule constraints and indexes', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    expect(schema).toContain('model TaskRuleVersion');
    expect(schema).toContain('model Task');
    expect(migration).toMatch(/CREATE TABLE task_rule_versions/i);
    expect(migration).toMatch(/CREATE TABLE tasks/i);
    expect(migration).toMatch(/tasks_rule_fields_check/i);
    expect(migration).toMatch(/dedupe_key varchar\(320\) UNIQUE/i);
    expect(migration).toMatch(/task_rule_versions_one_active_idx/i);
  });

  it('protects terminal tasks/rules and denies application-role deletes', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toMatch(/tasks_terminal_immutable/i);
    expect(migration).toMatch(/task_rule_versions_active_immutable/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON task_rule_versions, tasks TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON task_rule_versions, tasks FROM cms_api/i);
  });
});

