import { Module } from '@nestjs/common';
import { CommandPlatformModule } from '../../platform/command-platform.module.js';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { DisabledObjectStorageAdapter, OBJECT_STORAGE, type ObjectStoragePort } from '../../platform/storage/object-storage.port.js';
import { OBJECT_STORAGE_CLIENT, createObjectStorageAdapter } from '../../platform/storage/object-storage.factory.js';
import type { S3CompatibleClient } from '../../platform/storage/s3-object-storage.adapter.js';
import { RUNTIME_CONFIG, RuntimeConfigModule, type RuntimeConfig } from '../../platform/config/config.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { DocumentService, DisabledMalwareScanner, type MalwareScannerPort } from './application/document.service.js';
import { DocumentsController } from './http/documents.controller.js';
import { LocalStorageController } from './http/local-storage.controller.js';
import { DocumentPrismaRepository } from './infrastructure/document.prisma-repository.js';
import { DOCUMENT_MALWARE_SCANNER, MALWARE_SCANNER_CLIENT, createDocumentMalwareScanner, type MalwareScannerClient } from './infrastructure/malware-scanner.factory.js';

@Module({
  imports: [DatabaseModule, CommandPlatformModule, IdentityAccessModule, RuntimeConfigModule.forRoot()],
  // Register static local signed-url routes before the guarded :id route.
  controllers: [LocalStorageController, DocumentsController],
  providers: [
    DocumentPrismaRepository,
    DisabledObjectStorageAdapter,
    DisabledMalwareScanner,
    { provide: OBJECT_STORAGE_CLIENT, useValue: undefined },
    { provide: MALWARE_SCANNER_CLIENT, useValue: undefined },
    {
      provide: OBJECT_STORAGE,
      inject: [RUNTIME_CONFIG, DisabledObjectStorageAdapter, OBJECT_STORAGE_CLIENT],
      useFactory: (config: RuntimeConfig, disabled: DisabledObjectStorageAdapter, client: S3CompatibleClient | undefined) => createObjectStorageAdapter(config, disabled, client),
    },
    {
      provide: DOCUMENT_MALWARE_SCANNER,
      inject: [RUNTIME_CONFIG, DisabledMalwareScanner, MALWARE_SCANNER_CLIENT],
      useFactory: (config: RuntimeConfig, disabled: DisabledMalwareScanner, client: MalwareScannerClient | undefined) => createDocumentMalwareScanner(config, disabled, client),
    },
    {
      provide: DocumentService,
      useFactory: (repository: DocumentPrismaRepository, storage: ObjectStoragePort, scanner: MalwareScannerPort, config: RuntimeConfig) => new DocumentService(repository, storage, scanner, { uploadTtlSeconds: config.storage.uploadTtlSeconds, downloadTtlSeconds: config.storage.downloadTtlSeconds }),
      inject: [DocumentPrismaRepository, OBJECT_STORAGE, DOCUMENT_MALWARE_SCANNER, RUNTIME_CONFIG],
    },
  ],
  exports: [DocumentService],
})
export class DocumentsModule {}
