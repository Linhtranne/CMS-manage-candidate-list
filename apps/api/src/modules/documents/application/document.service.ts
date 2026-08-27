import { randomUUID } from 'node:crypto';
import type { ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { assertDownloadable, assertUploadMetadata, DocumentDomainError, type DocumentStatus } from '../domain/document.rules.js';

export interface DocumentScopeContext { actorId: string; teamId?: string; scope: 'SELF' | 'TEAM'; requestId: string; correlationId: string; }
export interface DocumentEntity { id: string; candidateId: string; ownerUserId: string; teamId: string | null; title: string; category: string; status: DocumentStatus; latestVersionNo: number; legalHold: boolean; version: { versionNo: number; sizeBytes: number; checksum: string; claimedMime: string; detectedMime: string | null; status: DocumentStatus; objectKey: string } }
export type PublicDocumentEntity = Omit<DocumentEntity, 'version'> & { version: Omit<DocumentEntity['version'], 'objectKey'> };
export interface DocumentRepository {
  withTransaction<T>(work: (repository: DocumentRepository, transaction: unknown) => Promise<T>): Promise<T>;
  createUpload(input: { candidateId: string; ownerUserId: string; teamId?: string | null; title: string; category: string; objectKey: string; sizeBytes: number; checksum: string; claimedMime: string }): Promise<DocumentEntity>;
  findScoped(id: string, context: DocumentScopeContext): Promise<DocumentEntity | null>;
  updateScan(id: string, versionNo: number, input: { status: DocumentStatus; detectedMime?: string | null; rejectionReason?: string | null }): Promise<DocumentEntity | null>;
  link(input: { documentId: string; candidateId: string; journeyId?: string; milestoneId?: string; linkedBy: string }): Promise<void>;
  appendAccessAudit(transaction: unknown, input: { documentId: string; versionNo: number; actorUserId: string; action: string; requestId: string }): Promise<void>;
}
export interface MalwareScannerPort { scan(input: { objectKey: string; checksum: string; contentType: string }): Promise<{ safe: boolean; signature?: string }>; }
export class DisabledMalwareScanner implements MalwareScannerPort { async scan(): Promise<{ safe: boolean }> { throw new DocumentDomainError('DOCUMENT_SCANNER_DISABLED', 503); } }
export interface DocumentServiceOptions { uploadTtlSeconds?: number; downloadTtlSeconds?: number; }

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: ObjectStoragePort,
    private readonly scanner: MalwareScannerPort,
    private readonly options: Required<DocumentServiceOptions> = { uploadTtlSeconds: 300, downloadTtlSeconds: 60 },
  ) {}
  async createUpload(input: { candidateId: string; ownerUserId: string; title: string; category: string; claimedMime: string; sizeBytes: number; checksum: string }, context: DocumentScopeContext): Promise<{ documentId: string; versionNo: number; status: DocumentStatus; uploadUrl: string; uploadExpiresAt: Date }> {
    if (context.scope === 'SELF' && context.actorId !== input.ownerUserId) throw new DocumentDomainError('DOCUMENT_OWNER_OUT_OF_SCOPE', 403);
    assertUploadMetadata(input);
    const objectKey = `quarantine/candidates/${input.candidateId}/${randomUUID()}`;
    if (!this.storage.createSignedUpload) throw new DocumentDomainError('DOCUMENT_UPLOAD_SIGNING_UNAVAILABLE', 503);
    const upload = await this.storage.createSignedUpload(objectKey, this.options.uploadTtlSeconds, input.claimedMime, input.sizeBytes, input.checksum);
    const document = await this.repository.createUpload({ ...input, teamId: context.teamId ?? null, objectKey });
    return { documentId: document.id, versionNo: document.latestVersionNo, status: document.status, uploadUrl: upload.url, uploadExpiresAt: upload.expiresAt };
  }
  async finalizeUpload(id: string, context: DocumentScopeContext): Promise<PublicDocumentEntity> {
    const document = await this.repository.findScoped(id, context); if (!document) throw new DocumentDomainError('DOCUMENT_NOT_FOUND', 404);
    const head = await this.storage.head(document.version.objectKey);
    if (head.checksum !== document.version.checksum) throw new DocumentDomainError('DOCUMENT_CHECKSUM_MISMATCH');
    const scan = await this.scanner.scan({ objectKey: head.objectKey, checksum: head.checksum, contentType: head.contentType ?? document.version.claimedMime });
    const updated = await this.repository.updateScan(id, document.version.versionNo, { status: scan.safe ? 'SAFE' : 'REJECTED', detectedMime: head.contentType ?? null, rejectionReason: scan.safe ? null : scan.signature ?? 'MALWARE_DETECTED' });
    if (!updated) throw new DocumentDomainError('DOCUMENT_VERSION_CONFLICT', 409);
    return this.publicView(updated);
  }
  async get(id: string, context: DocumentScopeContext): Promise<PublicDocumentEntity> { const document = await this.repository.findScoped(id, context); if (!document) throw new DocumentDomainError('DOCUMENT_NOT_FOUND', 404); return this.publicView(document); }
  async link(id: string, input: { candidateId: string; journeyId?: string; milestoneId?: string }, context: DocumentScopeContext): Promise<{ linked: true }> {
    const document = await this.repository.findScoped(id, context); if (!document) throw new DocumentDomainError('DOCUMENT_NOT_FOUND', 404); assertDownloadable(document.status);
    if (document.candidateId !== input.candidateId) throw new DocumentDomainError('DOCUMENT_CANDIDATE_MISMATCH', 409);
    await this.repository.link({ documentId: id, candidateId: input.candidateId, journeyId: input.journeyId, milestoneId: input.milestoneId, linkedBy: context.actorId });
    return { linked: true };
  }
  async createDownload(id: string, context: DocumentScopeContext): Promise<{ url: string; expiresAt: Date }> {
    const document = await this.repository.findScoped(id, context); if (!document) throw new DocumentDomainError('DOCUMENT_NOT_FOUND', 404); assertDownloadable(document.status);
    const signed = await this.storage.createSignedDownload(document.version.objectKey, this.options.downloadTtlSeconds);
    await this.repository.withTransaction(async (_repository, transaction) => this.repository.appendAccessAudit(transaction, { documentId: id, versionNo: document.version.versionNo, actorUserId: context.actorId, action: 'DOWNLOAD_LINK_CREATED', requestId: context.requestId }));
    return signed;
  }
  private publicView(document: DocumentEntity): PublicDocumentEntity { const { objectKey, ...version } = document.version; void objectKey; return { ...document, version }; }
}
