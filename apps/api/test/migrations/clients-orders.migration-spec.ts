import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiRoot = resolve(import.meta.dirname, '../..');

describe('clients and orders migration contract', () => {
  it('defines client contacts, order requirements and append-only history tables', () => {
    const schema = readFileSync(resolve(apiRoot, 'prisma/schema.prisma'), 'utf8');
    const migration = readFileSync(resolve(apiRoot, 'prisma/migrations/20260820010200_clients_orders/migration.sql'), 'utf8');
    for (const model of ['Client', 'ClientContact', 'JobOrder', 'JobOrderRequirementVersion', 'JobOrderStatusHistory']) expect(schema).toContain(`model ${model}`);
    for (const table of ['clients', 'client_contacts', 'job_orders', 'job_order_requirement_versions', 'job_order_status_history']) {
      expect(migration).toMatch(new RegExp(`CREATE TABLE ${table}\\b`, 'i'));
    }
    expect(migration).toMatch(/job_orders_status_check/i);
    expect(migration).toMatch(/job_orders_target_check/i);
    expect(migration).toMatch(/job_order_requirement_versions_unique/i);
    expect(migration).toMatch(/job_orders_status_deadline_idx/i);
  });

  it('grants application writes without allowing deletes', () => {
    const migration = readFileSync(resolve(apiRoot, 'prisma/migrations/20260820010200_clients_orders/migration.sql'), 'utf8');
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON clients, client_contacts, job_orders, job_order_requirement_versions, job_order_status_history TO cms_api/i);
    expect(migration).toMatch(/REVOKE DELETE ON clients, client_contacts, job_orders, job_order_requirement_versions, job_order_status_history FROM cms_api/i);
  });
});
