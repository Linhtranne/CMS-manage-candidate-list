import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { detectMagicContentType } from '../files/mime-detect.js';
import type { ObjectStoragePort, StoredObjectMetadata } from './object-storage.port.js';

type UploadGrant = {
  objectKey: string;
  expiresAt: number;
  contentType: string;
  sizeBytes: number;
  checksum: string;
};

type DownloadGrant = { objectKey: string; expiresAt: number };

type LocalObject = { bytes: Buffer; metadata: StoredObjectMetadata };

/**
 * Development-only object storage. It keeps bytes in the API process and uses
 * short-lived opaque grants so the normal upload/finalize/download contract is
 * exercised locally without requiring S3 or an antivirus service.
 */
@Injectable()
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  private readonly objects = new Map<string, LocalObject>();
  private readonly uploads = new Map<string, UploadGrant>();
  private readonly downloads = new Map<string, DownloadGrant>();

  async createSignedUpload(objectKey: string, ttlSeconds: number, contentType: string, sizeBytes: number, checksum: string) {
    const token = randomUUID();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.uploads.set(token, { objectKey, expiresAt, contentType, sizeBytes, checksum });
    return { url: `/api/v1/documents/local-upload?token=${encodeURIComponent(token)}`, expiresAt: new Date(expiresAt) };
  }

  async putLocalUpload(token: string, input: { bytes: Buffer; contentType?: string; checksum?: string }): Promise<void> {
    const grant = this.uploads.get(token);
    if (!grant || grant.expiresAt < Date.now()) throw new Error('LOCAL_UPLOAD_GRANT_EXPIRED');
    this.uploads.delete(token);
    if (input.bytes.length !== grant.sizeBytes) throw new Error('ATTACHMENT_SIZE_MISMATCH');
    const checksum = createHash('sha256').update(input.bytes).digest('hex');
    if (checksum !== grant.checksum || (input.checksum && input.checksum !== checksum)) throw new Error('ATTACHMENT_CHECKSUM_MISMATCH');
    this.objects.set(grant.objectKey, {
      bytes: input.bytes,
      metadata: {
        objectKey: grant.objectKey,
        sizeBytes: input.bytes.length,
        checksum,
        contentType: detectMagicContentType(input.bytes.subarray(0, 512), input.contentType ?? grant.contentType),
      },
    });
  }

  async putQuarantine(input: { objectKey: string; source: Readable; maxBytes: number; contentType?: string; expectedChecksum?: string }): Promise<StoredObjectMetadata> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of input.source) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > input.maxBytes) throw new Error('ATTACHMENT_SIZE_LIMIT');
      chunks.push(bytes);
    }
    const body = Buffer.concat(chunks);
    const checksum = createHash('sha256').update(body).digest('hex');
    if (input.expectedChecksum && input.expectedChecksum !== checksum) throw new Error('ATTACHMENT_CHECKSUM_MISMATCH');
    const metadata: StoredObjectMetadata = {
      objectKey: input.objectKey,
      sizeBytes: body.length,
      checksum,
      contentType: detectMagicContentType(body.subarray(0, 512), input.contentType ?? ''),
    };
    this.objects.set(input.objectKey, { bytes: body, metadata });
    return metadata;
  }

  async head(objectKey: string): Promise<StoredObjectMetadata> {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error('LOCAL_OBJECT_NOT_FOUND');
    return { ...object.metadata };
  }

  async createSignedDownload(objectKey: string, ttlSeconds: number) {
    if (!this.objects.has(objectKey)) throw new Error('LOCAL_OBJECT_NOT_FOUND');
    const token = randomUUID();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.downloads.set(token, { objectKey, expiresAt });
    return { url: `/api/v1/documents/local-download?token=${encodeURIComponent(token)}`, expiresAt: new Date(expiresAt) };
  }

  readLocalDownload(token: string): { bytes: Buffer; metadata: StoredObjectMetadata } {
    const grant = this.downloads.get(token);
    if (!grant || grant.expiresAt < Date.now()) throw new Error('LOCAL_DOWNLOAD_GRANT_EXPIRED');
    const object = this.objects.get(grant.objectKey);
    if (!object) throw new Error('LOCAL_OBJECT_NOT_FOUND');
    return { bytes: object.bytes, metadata: { ...object.metadata } };
  }

  async delete(objectKey: string): Promise<void> {
    this.objects.delete(objectKey);
  }
}

export type LocalObjectStoragePort = LocalObjectStorageAdapter;
