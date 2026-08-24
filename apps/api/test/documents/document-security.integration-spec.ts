import { describe, expect, it } from 'vitest';
import { DocumentService } from '../../src/modules/documents/application/document.service.js';
import { DocumentDomainError } from '../../src/modules/documents/domain/document.rules.js';
import type { DocumentEntity, DocumentRepository } from '../../src/modules/documents/application/document.service.js';

const base: DocumentEntity = { id: 'd1', candidateId: 'c1', ownerUserId: 'u1', teamId: 't1', title: 'Passport', category: 'IDENTITY', status: 'SAFE', latestVersionNo: 1, legalHold: false, version: { versionNo: 1, objectKey: 'private/key', sizeBytes: 10, checksum: 'a'.repeat(64), claimedMime: 'application/pdf', detectedMime: 'application/pdf', status: 'SAFE' } };
class Repo implements DocumentRepository { row = base; async withTransaction<T>(work: (repo: DocumentRepository, tx: unknown) => Promise<T>): Promise<T> { return work(this, {}); } async createUpload() { return this.row; } async findScoped() { return this.row; } async updateScan() { return this.row; } async link() {} async appendAccessAudit() {} }
describe('document security', () => {
  it('rejects cross-candidate links and does not expose object keys', async () => {
    const service = new DocumentService(new Repo(), { head: async () => ({ objectKey: 'private/key', sizeBytes: 10, checksum: 'a'.repeat(64) }), putQuarantine: async () => { throw new Error(); }, createSignedDownload: async () => ({ url: 'x', expiresAt: new Date() }), delete: async () => {} }, { scan: async () => ({ safe: true }) });
    await expect(service.link('d1', { candidateId: 'c2' }, { actorId: 'u1', teamId: 't1', scope: 'TEAM', requestId: 'r', correlationId: 'c' })).rejects.toMatchObject({ code: 'DOCUMENT_CANDIDATE_MISMATCH' });
    const view = await service.get('d1', { actorId: 'u1', teamId: 't1', scope: 'TEAM', requestId: 'r', correlationId: 'c' });
    expect('objectKey' in view.version).toBe(false);
  });
  it('fails closed when scanner is disabled', async () => {
    const repo = new Repo(); const service = new DocumentService(repo, { head: async () => ({ objectKey: 'private/key', sizeBytes: 10, checksum: 'a'.repeat(64), contentType: 'application/pdf' }), putQuarantine: async () => { throw new Error(); }, createSignedDownload: async () => ({ url: 'x', expiresAt: new Date() }), delete: async () => {} }, { scan: async () => { throw new DocumentDomainError('DOCUMENT_SCANNER_DISABLED', 503); } });
    await expect(service.finalizeUpload('d1', { actorId: 'u1', teamId: 't1', scope: 'TEAM', requestId: 'r', correlationId: 'c' })).rejects.toMatchObject({ code: 'DOCUMENT_SCANNER_DISABLED' });
  });

  it('uses configured signed URL TTLs instead of hard-coded provider values', async () => {
    const uploadTtls: number[] = [];
    const downloadTtls: number[] = [];
    const storage = {
      createSignedUpload: async (_key: string, ttl: number) => { uploadTtls.push(ttl); return { url: 'upload', expiresAt: new Date() }; },
      head: async () => ({ objectKey: 'private/key', sizeBytes: 10, checksum: 'a'.repeat(64) }),
      putQuarantine: async () => { throw new Error(); },
      createSignedDownload: async (_key: string, ttl: number) => { downloadTtls.push(ttl); return { url: 'download', expiresAt: new Date() }; },
      delete: async () => {},
    };
    const service = new DocumentService(new Repo(), storage, { scan: async () => ({ safe: true }) }, { uploadTtlSeconds: 120, downloadTtlSeconds: 45 });
    await service.createUpload({ candidateId: 'c1', ownerUserId: 'u1', title: 'CV', category: 'CV', claimedMime: 'application/pdf', sizeBytes: 10, checksum: 'a'.repeat(64) }, { actorId: 'u1', teamId: 't1', scope: 'TEAM', requestId: 'r', correlationId: 'c' });
    await service.createDownload('d1', { actorId: 'u1', teamId: 't1', scope: 'TEAM', requestId: 'r', correlationId: 'c' });
    expect(uploadTtls).toEqual([120]);
    expect(downloadTtls).toEqual([45]);
  });
});
