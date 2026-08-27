import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface StoredObjectMetadata {
  objectKey: string;
  sizeBytes: number;
  checksum: string;
  contentType?: string;
}

export interface ObjectStoragePort {
  createSignedUpload?(objectKey: string, ttlSeconds: number, contentType: string, sizeBytes: number, checksum: string): Promise<{ url: string; expiresAt: Date }>;
  putQuarantine(input: {
    objectKey: string;
    source: Readable;
    maxBytes: number;
    contentType?: string;
    expectedChecksum?: string;
  }): Promise<StoredObjectMetadata>;
  head(objectKey: string): Promise<StoredObjectMetadata>;
  createSignedDownload(objectKey: string, ttlSeconds: number): Promise<{ url: string; expiresAt: Date }>;
  delete(objectKey: string): Promise<void>;
}

@Injectable()
export class DisabledObjectStorageAdapter implements ObjectStoragePort {
  private unavailable(): never { throw new Error('OBJECT_STORAGE_DISABLED'); }
  createSignedUpload(): Promise<{ url: string; expiresAt: Date }> { return Promise.reject(this.unavailable()); }
  putQuarantine(): Promise<StoredObjectMetadata> { return Promise.reject(this.unavailable()); }
  head(): Promise<StoredObjectMetadata> { return Promise.reject(this.unavailable()); }
  createSignedDownload(): Promise<{ url: string; expiresAt: Date }> { return Promise.reject(this.unavailable()); }
  delete(): Promise<void> { return Promise.reject(this.unavailable()); }
}
