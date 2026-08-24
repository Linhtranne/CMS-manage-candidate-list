import { createHash } from 'node:crypto';
import { Transform, type Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import type { ObjectStoragePort, StoredObjectMetadata } from './object-storage.port.js';
import { detectMagicContentType } from '../files/mime-detect.js';

export interface S3CompatibleClient {
  presignPutObject?(key: string, ttlSeconds: number, contentType: string, sizeBytes: number, checksum: string): Promise<{ url: string; expiresAt: Date }>;
  putObject(input: { key: string; body: Readable; contentType?: string }): Promise<{ sizeBytes?: number; checksum?: string }>;
  headObject(key: string): Promise<{ sizeBytes: number; checksum?: string; contentType?: string }>;
  presignGetObject(key: string, ttlSeconds: number): Promise<{ url: string; expiresAt: Date }>;
  deleteObject(key: string): Promise<void>;
}

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  constructor(private readonly client: S3CompatibleClient) {}
  async createSignedUpload(objectKey: string, ttlSeconds: number, contentType: string, sizeBytes: number, checksum: string) { if (!this.client.presignPutObject) throw new Error('OBJECT_STORAGE_UPLOAD_SIGNING_UNAVAILABLE'); return this.client.presignPutObject(objectKey, ttlSeconds, contentType, sizeBytes, checksum); }

  async putQuarantine(input: { objectKey: string; source: Readable; maxBytes: number; contentType?: string; expectedChecksum?: string }): Promise<StoredObjectMetadata> {
    let sizeBytes = 0;
    let prefix = Buffer.alloc(0);
    const hash = createHash('sha256');
    const tracker = new Transform({
      transform: (chunk: Buffer, _encoding, callback) => {
        sizeBytes += chunk.length;
        if (sizeBytes > input.maxBytes) return callback(new Error('ATTACHMENT_SIZE_LIMIT'));
        if (prefix.length < 512) prefix = Buffer.concat([prefix, chunk.subarray(0, 512 - prefix.length)]);
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    try {
      const result = await this.client.putObject({ key: input.objectKey, body: input.source.pipe(tracker), contentType: input.contentType });
      const checksum = hash.digest('hex');
      if (input.expectedChecksum && input.expectedChecksum !== checksum) throw new Error('ATTACHMENT_CHECKSUM_MISMATCH');
      return { objectKey: input.objectKey, sizeBytes: result.sizeBytes ?? sizeBytes, checksum: result.checksum ?? checksum, contentType: detectMagicContentType(prefix, input.contentType ?? '') };
    } catch (error) {
      await this.client.deleteObject(input.objectKey).catch(() => undefined);
      throw error;
    }
  }

  async head(objectKey: string): Promise<StoredObjectMetadata> {
    const metadata = await this.client.headObject(objectKey);
    return { objectKey, sizeBytes: metadata.sizeBytes, checksum: metadata.checksum ?? '', ...(metadata.contentType ? { contentType: metadata.contentType } : {}) };
  }

  createSignedDownload(objectKey: string, ttlSeconds: number) { return this.client.presignGetObject(objectKey, ttlSeconds); }
  delete(objectKey: string) { return this.client.deleteObject(objectKey); }
}
