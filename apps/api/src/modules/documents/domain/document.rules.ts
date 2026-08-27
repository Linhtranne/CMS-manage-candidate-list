export const DOCUMENT_STATUSES = ['QUARANTINED', 'SCANNING', 'SAFE', 'REJECTED', 'RETIRED', 'PURGED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const SAFE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'] as const;
export class DocumentDomainError extends Error { readonly code: string; readonly statusCode: number; constructor(code: string, statusCode = 422) { super(code); this.name = 'DocumentDomainError'; this.code = code; this.statusCode = statusCode; } }
export function assertUploadMetadata(input: { title: string; category: string; claimedMime: string; sizeBytes: number; checksum: string }): void {
  if (!input.title.trim() || !input.category.trim()) throw new DocumentDomainError('DOCUMENT_METADATA_REQUIRED');
  if (!SAFE_MIME_TYPES.includes(input.claimedMime as never)) throw new DocumentDomainError('DOCUMENT_MIME_UNSUPPORTED');
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > 25 * 1024 * 1024) throw new DocumentDomainError('DOCUMENT_SIZE_INVALID');
  if (!/^[a-f0-9]{64}$/i.test(input.checksum)) throw new DocumentDomainError('DOCUMENT_CHECKSUM_INVALID');
}
export function assertDownloadable(status: DocumentStatus): void { if (status !== 'SAFE') throw new DocumentDomainError('DOCUMENT_NOT_SAFE', 409); }
