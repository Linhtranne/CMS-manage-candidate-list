import { basename } from 'node:path';
import { detectMagicContentType } from '../../../platform/files/mime-detect.js';

export const ATTACHMENT_STATUSES = ['DISCOVERED', 'DOWNLOADING', 'QUARANTINED', 'SCANNING', 'SAFE', 'REJECTED', 'FAILED'] as const;
export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];

export const MAX_EMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_EMAIL_ATTACHMENT_COUNT = 20;

const DANGEROUS_CONTENT_TYPES = new Set([
  'application/x-msdownload',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-bat',
  'application/javascript',
  'text/html',
]);

export function sanitizeAttachmentFileName(value: string): string {
  const withoutControls = [...basename(value || 'attachment.bin')].filter((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 32 && code !== 127;
  }).join('');
  const stripped = withoutControls
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();
  return (stripped || 'attachment.bin').slice(0, 240);
}

export function detectContentType(prefix: Uint8Array, claimed: string): string {
  return detectMagicContentType(prefix, claimed);
}

export function assertSafeContentType(claimed: string, detected: string): void {
  const normalizedClaimed = claimed.trim().toLowerCase();
  if (DANGEROUS_CONTENT_TYPES.has(normalizedClaimed) || DANGEROUS_CONTENT_TYPES.has(detected)) throw new Error('ATTACHMENT_DANGEROUS_MIME');
  if (normalizedClaimed && normalizedClaimed !== 'application/octet-stream' && detected !== normalizedClaimed) {
    throw new Error('ATTACHMENT_MIME_MISMATCH');
  }
}

export function assertAttachmentSize(sizeBytes: number): void {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > MAX_EMAIL_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_SIZE_LIMIT');
}
