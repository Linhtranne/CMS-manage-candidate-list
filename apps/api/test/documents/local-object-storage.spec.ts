import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LocalObjectStorageAdapter } from '../../src/platform/storage/local-object-storage.adapter.js';

describe('LocalObjectStorageAdapter', () => {
  it('round-trips a signed upload and download while enforcing the checksum', async () => {
    const storage = new LocalObjectStorageAdapter();
    const bytes = Buffer.from('local-document');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const upload = await storage.createSignedUpload('quarantine/candidate/document', 60, 'text/plain', bytes.length, checksum);
    const token = new URL(`http://local.test${upload.url}`).searchParams.get('token');

    await storage.putLocalUpload(token ?? '', { bytes, contentType: 'text/plain', checksum });
    await expect(storage.head('quarantine/candidate/document')).resolves.toMatchObject({ sizeBytes: bytes.length, checksum });

    const download = await storage.createSignedDownload('quarantine/candidate/document', 60);
    const downloadToken = new URL(`http://local.test${download.url}`).searchParams.get('token');
    expect(storage.readLocalDownload(downloadToken ?? '').bytes.toString()).toBe('local-document');
  });
});
