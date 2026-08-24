import type { RuntimeConfig } from '../config/config.schema.js';
import { S3ObjectStorageAdapter, type S3CompatibleClient } from './s3-object-storage.adapter.js';
import type { ObjectStoragePort } from './object-storage.port.js';

export const OBJECT_STORAGE_CLIENT = Symbol('OBJECT_STORAGE_CLIENT');

/**
 * Keeps storage disabled until the document activation record is approved.
 * A configured gate without a concrete client is a startup/configuration error,
 * never an implicit fallback to the disabled adapter.
 */
export function createObjectStorageAdapter(
  config: Pick<RuntimeConfig, 'activation'>,
  disabled: ObjectStoragePort,
  client?: S3CompatibleClient,
): ObjectStoragePort {
  if (!config.activation.documents.enabled) return disabled;
  if (!client) throw new Error('OBJECT_STORAGE_CLIENT_NOT_BOUND');
  return new S3ObjectStorageAdapter(client);
}
