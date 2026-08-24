import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiRoot = resolve(import.meta.dirname, '../..');
const migrationPath = resolve(apiRoot, 'prisma/migrations/20260820030100_journey_templates/migration.sql');
const schemaPath = resolve(apiRoot, 'prisma/schema.prisma');

describe('journey template migration contract', () => {
  it('defines versioned templates, milestone DAG inputs and active uniqueness', () => {
    const schema = readFileSync(schemaPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    for (const model of ['SupplyJourneyTemplate', 'SupplyJourneyTemplateVersion', 'JourneyMilestoneTemplate']) expect(schema).toContain(`model ${model}`);
    for (const table of ['supply_journey_templates', 'supply_journey_template_versions', 'journey_milestone_templates']) expect(migration).toMatch(new RegExp(`CREATE TABLE ${table}\\b`, 'i'));
    expect(migration).toMatch(/supply_journey_template_versions_one_active_idx/i);
    expect(migration).toMatch(/status IN \('DRAFT', 'ACTIVE', 'RETIRED'\)/i);
    expect(migration).toMatch(/residence_context IN \('OUTSIDE_JAPAN', 'IN_JAPAN'\)/i);
    expect(migration).toMatch(/jsonb_typeof\(dependency_codes\) = 'array'/i);
  });

  it('protects active versions and removes application-role delete capability', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toMatch(/supply_journey_template_versions_active_immutable/i);
    expect(migration).toMatch(/journey_milestone_templates_active_immutable/i);
    expect(migration).toMatch(/supply_journey_templates_referenced_immutable/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON supply_journey_templates, supply_journey_template_versions, journey_milestone_templates TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON supply_journey_templates, supply_journey_template_versions, journey_milestone_templates FROM cms_api/i);
  });
});
