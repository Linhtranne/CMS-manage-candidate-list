import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

const TTL_MS = 24 * 60 * 60 * 1000;

export class IdempotencyConflictError extends Error {
  readonly statusCode = 409;
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly messageKey = 'errors.idempotencyConflict';

  constructor() {
    super('Idempotency key was already used with a different request hash');
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInProgressError extends Error {
  readonly statusCode = 409;
  readonly code = 'IDEMPOTENCY_IN_PROGRESS';
  readonly messageKey = 'errors.idempotencyInProgress';

  constructor() {
    super('Idempotency key is currently being processed');
    this.name = 'IdempotencyInProgressError';
  }
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async runIdempotent<T>(key: string, requestHash: string, execute: () => Promise<T>): Promise<T> {
    if (!key || key.length > 320) throw new IdempotencyConflictError();
    if (!requestHash || requestHash.length > 128) throw new IdempotencyConflictError();

    const acquired = await this.prisma.$transaction(async (tx) => {
      const expiresAt = new Date(Date.now() + TTL_MS);
      const inserted = await tx.$executeRaw`
        INSERT INTO idempotency_records (scope_key, request_hash, state, expires_at)
        VALUES (${key}, ${requestHash}, 'IN_PROGRESS', ${expiresAt})
        ON CONFLICT (scope_key) DO NOTHING
      `;
      const record = await tx.idempotencyRecord.findUnique({ where: { scopeKey: key } });
      if (!record) throw new Error('Idempotency record disappeared during claim');
      if (inserted === 1) return { kind: 'claimed' as const };
      if (record.requestHash !== requestHash) throw new IdempotencyConflictError();
      if (record.state === 'COMPLETED' && record.expiresAt > new Date()) {
        return { kind: 'replay' as const, value: record.responseJson as T };
      }
      if (record.state === 'IN_PROGRESS' && record.expiresAt > new Date()) {
        throw new IdempotencyInProgressError();
      }
      await tx.idempotencyRecord.update({
        where: { scopeKey: key },
        data: { state: 'IN_PROGRESS', expiresAt, responseJson: Prisma.JsonNull },
      });
      return { kind: 'claimed' as const };
    });

    if (acquired.kind === 'replay') return acquired.value;
    try {
      const result = await execute();
      const responseJson = result === undefined ? Prisma.JsonNull : result as Prisma.InputJsonValue;
      await this.prisma.idempotencyRecord.update({
        where: { scopeKey: key },
        data: { state: 'COMPLETED', responseJson },
      });
      return result;
    } catch (error) {
      try {
        await this.prisma.idempotencyRecord.update({
          where: { scopeKey: key },
          data: { state: 'FAILED', responseJson: Prisma.JsonNull },
        });
      } catch {
        // Preserve the command failure; cleanup is observable through expiry/retry.
      }
      throw error;
    }
  }
}
