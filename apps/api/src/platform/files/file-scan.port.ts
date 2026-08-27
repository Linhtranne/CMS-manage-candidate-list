import { Injectable } from '@nestjs/common';

export const FILE_SCANNER = Symbol('FILE_SCANNER');

export type FileScanVerdict = 'SAFE' | 'REJECTED' | 'FAILED';

export interface FileScanResult {
  verdict: FileScanVerdict;
  reason?: string;
  detectedContentType?: string;
}

export interface FileScanPort {
  scan(input: {
    objectKey: string;
    fileName: string;
    claimedContentType: string;
    sizeBytes: number;
    checksum: string;
  }): Promise<FileScanResult>;
}

@Injectable()
export class DisabledFileScanAdapter implements FileScanPort {
  scan(): Promise<FileScanResult> { return Promise.resolve({ verdict: 'FAILED', reason: 'FILE_SCANNER_DISABLED' }); }
}
