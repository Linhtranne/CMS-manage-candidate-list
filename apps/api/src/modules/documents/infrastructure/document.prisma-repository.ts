import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { DocumentEntity, DocumentRepository, DocumentScopeContext } from '../application/document.service.js';
import type { DocumentStatus } from '../domain/document.rules.js';

type Row = { id: string; candidateId: string; ownerUserId: string; teamId: string | null; title: string; category: string; status: string; latestVersionNo: number; legalHold: boolean; versions: Array<{ versionNo: number; objectKey: string; sizeBytes: bigint; checksum: string; claimedMime: string; detectedMime: string | null; status: string }> };
function map(row: Row): DocumentEntity { const version = row.versions[0]; return { id: row.id, candidateId: row.candidateId, ownerUserId: row.ownerUserId, teamId: row.teamId, title: row.title, category: row.category, status: row.status as DocumentStatus, latestVersionNo: row.latestVersionNo, legalHold: row.legalHold, version: { versionNo: version.versionNo, objectKey: version.objectKey, sizeBytes: Number(version.sizeBytes), checksum: version.checksum, claimedMime: version.claimedMime, detectedMime: version.detectedMime, status: version.status as DocumentStatus } }; }

@Injectable()
export class DocumentPrismaRepository implements DocumentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}
  async withTransaction<T>(work: (repository: DocumentRepository, transaction: unknown) => Promise<T>): Promise<T> { if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new DocumentPrismaRepository(transaction), transaction)); return work(this, this.prisma); }
  async createUpload(input: { candidateId: string; ownerUserId: string; teamId?: string | null; title: string; category: string; objectKey: string; sizeBytes: number; checksum: string; claimedMime: string }): Promise<DocumentEntity> {
    const row = await this.prisma.document.create({ data: { candidateId: input.candidateId, ownerUserId: input.ownerUserId, teamId: input.teamId ?? null, title: input.title.trim(), category: input.category.trim(), status: 'QUARANTINED', latestVersionNo: 1, versions: { create: { versionNo: 1, objectKey: input.objectKey, sizeBytes: BigInt(input.sizeBytes), checksum: input.checksum.toLowerCase(), claimedMime: input.claimedMime, status: 'QUARANTINED' } } }, include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } } }); return map(row as unknown as Row);
  }
  async findScoped(id: string, context: DocumentScopeContext): Promise<DocumentEntity | null> {
    const scope = context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerUserId: context.actorId };
    const row = await this.prisma.document.findFirst({ where: { id, ...scope }, include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } } }); return row ? map(row as unknown as Row) : null;
  }
  async updateScan(id: string, versionNo: number, input: { status: DocumentStatus; detectedMime?: string | null; rejectionReason?: string | null }): Promise<DocumentEntity | null> {
    const updated = await this.prisma.documentVersion.updateMany({ where: { documentId: id, versionNo, status: { in: ['QUARANTINED', 'SCANNING'] } }, data: { status: input.status, detectedMime: input.detectedMime ?? null, rejectionReason: input.rejectionReason ?? null } }); if (updated.count !== 1) return null;
    await this.prisma.document.update({ where: { id }, data: { status: input.status } });
    const row = await this.prisma.document.findUnique({ where: { id }, include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } } }); return row ? map(row as unknown as Row) : null;
  }
  async link(input: { documentId: string; candidateId: string; journeyId?: string; milestoneId?: string; linkedBy: string }): Promise<void> { await this.prisma.documentLink.create({ data: { documentId: input.documentId, candidateId: input.candidateId, journeyId: input.journeyId ?? null, milestoneId: input.milestoneId ?? null, linkedBy: input.linkedBy } }); }
  async appendAccessAudit(transaction: unknown, input: { documentId: string; versionNo: number; actorUserId: string; action: string; requestId: string }): Promise<void> { const tx = transaction as Prisma.TransactionClient; await tx.documentAccessAudit.create({ data: input }); }
}
