import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/platform/config/config.schema.js';
import { DisabledObjectStorageAdapter } from '../../src/platform/storage/object-storage.port.js';
import { createObjectStorageAdapter } from '../../src/platform/storage/object-storage.factory.js';
import { DisabledMalwareScanner } from '../../src/modules/documents/application/document.service.js';
import { createDocumentMalwareScanner } from '../../src/modules/documents/infrastructure/malware-scanner.factory.js';
import { DisabledFileScanAdapter } from '../../src/platform/files/file-scan.port.js';
import { createFileScanner } from '../../src/platform/files/file-scan.factory.js';

function approvedDocumentConfig() {
  const directory = mkdtempSync(join(tmpdir(), 'cms-document-activation-'));
  const file = join(directory, 'dec-005.json');
  writeFileSync(file, JSON.stringify({
    id: 'DEC-005', status: 'approved', version: '1.0.0', scope: 'test', artifact_checksum: `sha256:${'a'.repeat(64)}`,
    approvals: [
      { role: 'Privacy/Legal Owner', identity: 'privacy@example.com', at: '2026-08-20T10:00:00Z' },
      { role: 'Business Owner', identity: 'business@example.com', at: '2026-08-20T10:01:00Z' },
    ],
  }));
  return {
    config: loadConfig({
      NODE_ENV: 'test',
      DOCUMENTS_ENABLED: 'true',
      DOCUMENT_APPROVAL_RECORD_FILE: file,
      STORAGE_ENDPOINT: 'https://storage.example.com',
      STORAGE_BUCKET: 'cms-private',
      MALWARE_SCANNER_ENDPOINT: 'https://scanner.example.com',
    }),
    directory,
  };
}

describe('document activation composition', () => {
  it('keeps disabled adapters when document activation is off', () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    const storage = new DisabledObjectStorageAdapter();
    const scanner = new DisabledMalwareScanner();
    const fileScanner = new DisabledFileScanAdapter();
    expect(createObjectStorageAdapter(config, storage)).toBe(storage);
    expect(createDocumentMalwareScanner(config, scanner)).toBe(scanner);
    expect(createFileScanner(config, fileScanner)).toBe(fileScanner);
  });

  it('fails closed when document activation is on but clients are not bound', () => {
    const { config, directory } = approvedDocumentConfig();
    try {
      expect(() => createObjectStorageAdapter(config, new DisabledObjectStorageAdapter())).toThrow('OBJECT_STORAGE_CLIENT_NOT_BOUND');
      expect(() => createDocumentMalwareScanner(config, new DisabledMalwareScanner())).toThrow('MALWARE_SCANNER_CLIENT_NOT_BOUND');
      expect(() => createFileScanner(config, new DisabledFileScanAdapter())).toThrow('FILE_SCANNER_CLIENT_NOT_BOUND');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
