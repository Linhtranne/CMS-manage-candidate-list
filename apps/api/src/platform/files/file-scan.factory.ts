import type { RuntimeConfig } from '../config/config.schema.js';
import type { FileScanPort, FileScanResult } from './file-scan.port.js';

export const FILE_SCANNER_CLIENT = Symbol('FILE_SCANNER_CLIENT');

export interface FileScannerClient {
  scan(input: {
    objectKey: string;
    fileName: string;
    claimedContentType: string;
    sizeBytes: number;
    checksum: string;
  }): Promise<FileScanResult>;
}

class FileScannerAdapter implements FileScanPort {
  constructor(private readonly client: FileScannerClient) {}

  scan(input: Parameters<FileScannerClient['scan']>[0]): Promise<FileScanResult> {
    return this.client.scan(input);
  }
}

export function createFileScanner(
  config: Pick<RuntimeConfig, 'activation'>,
  disabled: FileScanPort,
  client?: FileScannerClient,
): FileScanPort {
  if (!config.activation.documents.enabled) return disabled;
  if (!client) throw new Error('FILE_SCANNER_CLIENT_NOT_BOUND');
  return new FileScannerAdapter(client);
}
