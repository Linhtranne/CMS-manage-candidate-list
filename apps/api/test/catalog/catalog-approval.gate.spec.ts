import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CatalogApprovalGate } from '../../src/modules/catalog/application/catalog-approval.gate.js';
import { loadConfig } from '../../src/platform/config/config.schema.js';

describe('catalog approval gate', () => {
  it('reads only an approved server-owned DEC-004 artifact', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-004-'));
    const file = join(directory, 'dec-004.json');
    writeFileSync(file, JSON.stringify({
      id: 'DEC-004',
      status: 'approved',
      scope: 'development',
      artifact_checksum: `sha256:${'c'.repeat(64)}`,
      approvals: [
        { role: 'Product Owner', identity: 'product@example.com', at: '2026-08-20T10:00:00Z' },
        { role: 'Japan Operations Owner', identity: 'ops@example.com', at: '2026-08-20T10:01:00Z' },
      ],
    }));

    try {
      const config = loadConfig({ NODE_ENV: 'development', CATALOG_APPROVAL_RECORD_FILE: file });
      expect(new CatalogApprovalGate(config).getApproved()).toMatchObject({ decisionId: 'DEC-004', artifactChecksum: `sha256:${'c'.repeat(64)}` });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed for missing approver or invalid checksum', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cms-dec-004-invalid-'));
    const file = join(directory, 'dec-004.json');
    writeFileSync(file, JSON.stringify({ id: 'DEC-004', status: 'approved', scope: 'development', artifact_checksum: 'sha256:not-a-digest', approvals: [] }));
    try {
      const config = loadConfig({ NODE_ENV: 'development', CATALOG_APPROVAL_RECORD_FILE: file });
      expect(new CatalogApprovalGate(config).getApproved()).toBeUndefined();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
