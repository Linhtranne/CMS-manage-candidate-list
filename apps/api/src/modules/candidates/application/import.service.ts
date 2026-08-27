import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { CandidateDomainError } from '../domain/candidate.rules.js';
import { candidateBlindIndex } from '../infrastructure/candidate.crypto.js';
import { CandidateService } from './candidate.service.js';
import type { CandidateCommandContext } from '../domain/candidate.types.js';

const MAX_ROWS = 500;
const PREVIEW_TTL_MS = 15 * 60 * 1000;

type ImportRow = Record<string, unknown>;

function tokenHash(value: string, secret: string): string { return createHmac('sha256', secret).update(value).digest('hex'); }
function checksum(rows: ImportRow[]): string { return createHash('sha256').update(JSON.stringify(rows)).digest('hex'); }
function normalizeText(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
  const text = normalizeText(value);
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function toCandidateInput(row: ImportRow): Record<string, unknown> {
  const industryLabels = stringArray(row.industryLabels ?? row.industryLabel);
  return {
    name: normalizeText(row.name),
    industryLabels,
    occupation: normalizeText(row.occupation),
    japaneseLevel: normalizeText(row.japaneseLevel ?? row.japanese_level),
    email: normalizeText(row.email) ?? null,
    phone: normalizeText(row.phone) ?? null,
    passportNumber: normalizeText(row.passportNumber ?? row.passport_number) ?? null,
    address: normalizeText(row.address) ?? null,
    source: normalizeText(row.source) ?? 'IMPORT',
    readinessStatus: normalizeText(row.readinessStatus) ?? 'POTENTIAL',
    contactabilityStatus: normalizeText(row.contactabilityStatus) ?? 'CONTACTABLE',
    recordStatus: 'ACTIVE',
  };
}
function asImportRow(value: Prisma.JsonValue): ImportRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as ImportRow : {}; }

@Injectable()
export class CandidateImportService {
  private readonly secret: string;
  private readonly candidateSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidateService,
    @Inject(RUNTIME_CONFIG) config: RuntimeConfig,
  ) { this.secret = config.security.sessionSecret; this.candidateSecret = config.security.encryptionKey; }

  async create(input: { fileName: string; rows: ImportRow[]; mappingVersion?: string; ownerId: string; teamId?: string; }): Promise<{ importId: string; previewToken: string; fileName: string; totalRows: number; validRows: number; invalidRows: number; duplicateRows: number; createdCandidateIds: string[]; }> {
    if (input.rows.length === 0 || input.rows.length > MAX_ROWS) throw new CandidateDomainError('IMPORT_ROW_LIMIT_EXCEEDED', `imports accept 1-${MAX_ROWS} rows`, 422);
    const previewToken = randomBytes(32).toString('base64url');
    const rows = input.rows.map((raw, index) => {
      const candidate = toCandidateInput(raw);
      const normalizedHash = createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
      const validationError = this.validateRow(candidate);
      return { raw, candidate, rowNumber: index + 1, normalizedHash, idempotencyKey: `pending:${index + 1}:${normalizedHash}`, state: validationError ? 'ERROR' : 'VALID', errorCode: validationError } as const;
    });
    const importChecksum = checksum(input.rows);
    const created = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.candidateImportBatch.create({ data: {
        ownerId: input.ownerId, teamId: input.teamId, fileName: input.fileName.trim(), checksum: importChecksum,
        mappingVersion: input.mappingVersion ?? 'v1', status: 'PREVIEW_READY', previewTokenHash: tokenHash(previewToken, this.secret),
        previewExpiresAt: new Date(Date.now() + PREVIEW_TTL_MS), totalRows: rows.length,
        validRows: rows.filter((row) => row.state === 'VALID').length, invalidRows: rows.filter((row) => row.state === 'ERROR').length,
        duplicateRows: 0, errors: rows.filter((row) => row.state === 'ERROR').map((row) => ({ rowNumber: row.rowNumber, code: row.errorCode })),
      } });
      await tx.candidateImportRow.createMany({ data: rows.map((row) => ({ batchId: batch.id, rowNumber: row.rowNumber, normalizedHash: row.normalizedHash, idempotencyKey: `${batch.id}:${row.rowNumber}:${row.normalizedHash}`, rawJson: row.raw as Prisma.InputJsonValue, state: row.state, errorCode: row.errorCode })) });
      return batch;
    });
    return { importId: created.id, previewToken, fileName: created.fileName, totalRows: created.totalRows, validRows: created.validRows, invalidRows: created.invalidRows, duplicateRows: created.duplicateRows, createdCandidateIds: [] };
  }

  async preview(importId: string, ownerId: string, teamId?: string) {
    const batch = await this.scopedBatch(importId, ownerId, teamId);
    const rows = await this.prisma.candidateImportRow.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: 'asc' }, select: { rowNumber: true, state: true, errorCode: true, rawJson: true, candidateId: true } });
    return { importId: batch.id, fileName: batch.fileName, status: batch.status, totalRows: batch.totalRows, validRows: batch.validRows, invalidRows: batch.invalidRows, duplicateRows: batch.duplicateRows, rows: rows.map((row) => ({ rowNumber: row.rowNumber, state: row.state, errorCode: row.errorCode, candidateId: row.candidateId, sample: this.maskRow(row.rawJson) })) };
  }

  async commit(importId: string, previewToken: string, ownerId: string, teamId: string | undefined, context: CandidateCommandContext) {
    const batch = await this.scopedBatch(importId, ownerId, teamId);
    if (batch.status === 'COMPLETED' || batch.status === 'COMPLETED_WITH_ERRORS') return this.summary(batch.id);
    if (!batch.previewTokenHash || !batch.previewExpiresAt || batch.previewExpiresAt.getTime() < Date.now() || !this.safeEqual(batch.previewTokenHash, tokenHash(previewToken, this.secret))) throw new CandidateDomainError('IMPORT_PREVIEW_TOKEN_INVALID', 'preview token is invalid or expired', 409);
    await this.prisma.candidateImportBatch.update({ where: { id: batch.id }, data: { status: 'COMMITTING', version: { increment: 1 } } });
    const rows = await this.prisma.candidateImportRow.findMany({ where: { batchId: batch.id, state: { in: ['VALID', 'PENDING'] } }, orderBy: { rowNumber: 'asc' } });
    const createdIds: string[] = [];
    let duplicateRows = 0;
    for (const row of rows) {
      if (row.state === 'CREATED') continue;
      try {
        const candidate = await this.candidates.create(toCandidateInput(asImportRow(row.rawJson)) as never, context);
        createdIds.push(candidate.id);
        await this.prisma.candidateImportRow.update({ where: { id: row.id }, data: { state: 'CREATED', candidateId: candidate.id } });
      } catch (error) {
        if (error instanceof CandidateDomainError && error.code === 'DUPLICATE_CANDIDATE_REVIEW_REQUIRED') {
          duplicateRows += 1;
          const candidateId = await this.findExactDuplicate(toCandidateInput(asImportRow(row.rawJson)));
          if (candidateId) await this.prisma.candidateDuplicateCase.create({ data: { sourceCandidateId: candidateId, kind: 'IMPORT_REVIEW', signals: { rowNumber: row.rowNumber }, state: 'OPEN' } });
          await this.prisma.candidateImportRow.update({ where: { id: row.id }, data: { state: 'DUPLICATE', errorCode: 'DUPLICATE_CANDIDATE_REVIEW_REQUIRED' } });
        } else {
          await this.prisma.candidateImportRow.update({ where: { id: row.id }, data: { state: 'ERROR', errorCode: error instanceof CandidateDomainError ? error.code : 'IMPORT_ROW_FAILED' } });
        }
      }
    }
    const remainingErrors = await this.prisma.candidateImportRow.count({ where: { batchId: batch.id, state: { in: ['ERROR', 'DUPLICATE', 'REVIEW'] } } });
    const final = await this.prisma.candidateImportBatch.update({ where: { id: batch.id }, data: { status: remainingErrors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED', duplicateRows, validRows: createdIds.length, invalidRows: remainingErrors, createdCandidateIds: createdIds as Prisma.InputJsonValue, previewTokenHash: null, previewExpiresAt: null } });
    return { importId: final.id, fileName: final.fileName, totalRows: final.totalRows, validRows: final.validRows, invalidRows: final.invalidRows, duplicateRows: final.duplicateRows, createdCandidateIds: createdIds };
  }

  async summary(importId: string) {
    const batch = await this.prisma.candidateImportBatch.findUnique({ where: { id: importId } });
    if (!batch) throw new CandidateDomainError('IMPORT_NOT_FOUND', 'import batch was not found', 404);
    const ids = Array.isArray(batch.createdCandidateIds) ? batch.createdCandidateIds.filter((value): value is string => typeof value === 'string') : [];
    return { importId: batch.id, fileName: batch.fileName, totalRows: batch.totalRows, validRows: batch.validRows, invalidRows: batch.invalidRows, duplicateRows: batch.duplicateRows, createdCandidateIds: ids };
  }

  async findOpenDuplicateCase(sourceCandidateId: string) {
    return this.prisma.candidateDuplicateCase.findFirst({ where: { sourceCandidateId, state: 'OPEN' }, orderBy: { createdAt: 'desc' } });
  }

  private validateRow(candidate: Record<string, unknown>): string | null {
    if (typeof candidate.name !== 'string' || candidate.name.length < 1) return 'NAME_REQUIRED';
    if (!Array.isArray(candidate.industryLabels) || candidate.industryLabels.length < 1) return 'INDUSTRY_REQUIRED';
    if (typeof candidate.occupation !== 'string' || candidate.occupation.length < 1) return 'OCCUPATION_REQUIRED';
    if (typeof candidate.japaneseLevel !== 'string' || candidate.japaneseLevel.length < 1) return 'JAPANESE_LEVEL_REQUIRED';
    return null;
  }

  private maskRow(value: Prisma.JsonValue): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const output = { ...(value as Record<string, unknown>) };
    for (const key of ['email', 'phone', 'passportNumber', 'address']) if (key in output) output[key] = '[MASKED]';
    return output;
  }

  private safeEqual(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }

  private async scopedBatch(id: string, ownerId: string, teamId?: string) {
    const batch = await this.prisma.candidateImportBatch.findFirst({ where: { id, OR: [{ ownerId }, ...(teamId ? [{ teamId }] : [])] } });
    if (!batch) throw new CandidateDomainError('IMPORT_NOT_FOUND', 'import batch was not found', 404);
    return batch;
  }

  private async findExactDuplicate(input: Record<string, unknown>): Promise<string | null> {
    const email = normalizeText(input.email); const phone = normalizeText(input.phone); const passport = normalizeText(input.passportNumber);
    const blind = passport ? candidateBlindIndex(passport, this.candidateSecret) : email ? candidateBlindIndex(email, this.candidateSecret) : phone ? candidateBlindIndex(phone, this.candidateSecret) : null;
    if (!blind) return null;
    const row = await this.prisma.candidate.findFirst({ where: { OR: [{ passportBlindIndex: blind }, { emailBlindIndex: blind }, { phoneBlindIndex: blind }] }, select: { id: true } });
    return row?.id ?? null;
  }
}
