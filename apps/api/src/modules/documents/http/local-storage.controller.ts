import { Controller, Get, Inject, Put, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { LocalObjectStorageAdapter } from '../../../platform/storage/local-object-storage.adapter.js';

@Controller('documents')
export class LocalStorageController {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort) {}

  @Put('local-upload')
  async upload(@Query('token') token: string | undefined, @Req() request: Request) {
    if (!(this.storage instanceof LocalObjectStorageAdapter)) throw new Error('LOCAL_STORAGE_DISABLED');
    const bytes = await this.readBody(request);
    await this.storage.putLocalUpload(token ?? '', {
      bytes,
      contentType: typeof request.headers['content-type'] === 'string' ? request.headers['content-type'] : undefined,
      checksum: typeof request.headers['x-amz-checksum-sha256'] === 'string' ? request.headers['x-amz-checksum-sha256'] : undefined,
    });
    return { uploaded: true };
  }

  @Get('local-download')
  download(@Query('token') token: string | undefined, @Res() response: Response): void {
    if (!(this.storage instanceof LocalObjectStorageAdapter)) throw new Error('LOCAL_STORAGE_DISABLED');
    const result = this.storage.readLocalDownload(token ?? '');
    response
      .status(200)
      .type(result.metadata.contentType ?? 'application/octet-stream')
      .set('Content-Length', String(result.metadata.sizeBytes))
      .send(result.bytes);
  }

  private async readBody(request: Request): Promise<Buffer> {
    if (Buffer.isBuffer(request.body)) return request.body;
    if (typeof request.body === 'string') return Buffer.from(request.body);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    return Buffer.concat(chunks);
  }
}
