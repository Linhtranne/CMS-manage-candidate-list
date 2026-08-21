import { randomUUID } from 'node:crypto';
import { firstValueFrom, of } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { EnvelopeInterceptor } from '../../src/platform/http/envelope.interceptor.js';
import { ProblemFilter } from '../../src/platform/http/problem.filter.js';
import {
  RequestContextMiddleware,
  getRequestContext,
} from '../../src/platform/http/request-context.middleware.js';
import { IdempotencyService } from '../../src/platform/idempotency/idempotency.service.js';
import { AuditWriter } from '../../src/modules/audit/audit-writer.js';
import { OutboxRepository } from '../../src/platform/outbox/outbox.repository.js';
import { OutboxDispatcher } from '../../src/platform/outbox/outbox.dispatcher.js';
import { CommandTransactionService } from '../../src/platform/transaction/command-transaction.service.js';
import { PrismaService } from '../../src/platform/database/prisma.service.js';
import { loadConfig } from '../../src/platform/config/config.schema.js';

function httpContext(request: Record<string, unknown> = {}, response: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('command transaction platform', () => {
  it('propagates request and correlation IDs through AsyncLocalStorage', async () => {
    const middleware = new RequestContextMiddleware();
    const request = { headers: { 'x-request-id': 'req_test_123', 'x-correlation-id': 'corr_test_456' } };
    const response = { setHeader: () => undefined };

    await new Promise<void>((resolve, reject) => {
      middleware.use(
        request as unknown as Parameters<typeof middleware.use>[0],
        response as unknown as Parameters<typeof middleware.use>[1],
        () => {
        try {
          expect(getRequestContext()).toMatchObject({ requestId: 'req_test_123', correlationId: 'corr_test_456' });
          resolve();
        } catch (error) {
          reject(error);
        }
        },
      );
    });
  });

  it('wraps successful responses and maps unexpected errors to redacted canonical envelopes', async () => {
    const response = { headers: {} as Record<string, string> };
    const request = { headers: { 'x-request-id': 'req_envelope_123' } };
    const context = httpContext(request, response);
    const interceptor = new EnvelopeInterceptor();
    const wrapped = await firstValueFrom(interceptor.intercept(context, { handle: () => of({ ok: true }) }));

    expect(wrapped).toEqual({ data: { ok: true }, requestId: 'req_envelope_123' });

    const filter = new ProblemFilter();
    const problemResponse = {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { this.body = body; return body; },
      body: undefined as unknown,
    };
    filter.catch(new Error('database password=SECRET_SENTINEL'), httpContext(request, problemResponse));

    expect(problemResponse.statusCode).toBe(500);
    expect(JSON.stringify(problemResponse.body)).not.toContain('SECRET_SENTINEL');
    expect(problemResponse.body).toMatchObject({ error: { code: 'INTERNAL_ERROR' }, requestId: 'req_envelope_123' });
  });

  const liveDatabase = Boolean(process.env.TEST_DATABASE_URL);
  const database = liveDatabase
    ? new PrismaService(loadConfig({ ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL }))
    : null;

  beforeAll(async () => {
    if (database) await database.onModuleInit();
  });

  afterAll(async () => {
    if (database) await database.onModuleDestroy();
  });

  it.skipIf(!liveDatabase)('replays the same idempotent result and rejects a different request hash', async () => {
    const service = new IdempotencyService(database!);
    const key = `task4-${randomUUID()}`;
    let executions = 0;
    const execute = async () => {
      executions += 1;
      return { accepted: true, execution: executions };
    };

    const first = await service.runIdempotent(key, 'hash-a', execute);
    const replay = await service.runIdempotent(key, 'hash-a', execute);

    expect(first).toEqual(replay);
    expect(executions).toBe(1);
    await expect(service.runIdempotent(key, 'hash-b', execute)).rejects.toMatchObject({ statusCode: 409 });
  });

  it.skipIf(!liveDatabase)('rolls back aggregate, audit and outbox together, then replays a failed outbox delivery', async () => {
    const audit = new AuditWriter();
    const outbox = new OutboxRepository();
    const command = new CommandTransactionService(database!);
    const email = `task4-${randomUUID()}@example.invalid`;

    await expect(command.run(async (tx) => {
      const user = await tx.user.create({ data: { displayName: 'Task 4', email, status: 'INVITED' } });
      await audit.append(tx, {
        actorUserId: user.id,
        action: 'TEST_CREATED',
        entityType: 'User',
        entityId: user.id,
        correlationId: 'task4-rollback',
        diffJson: { password: 'SECRET_SENTINEL', status: 'INVITED' },
      });
      await outbox.append(tx, {
        eventType: 'test.created',
        aggregateType: 'User',
        aggregateId: user.id,
        idempotencyKey: `task4-rollback-${randomUUID()}`,
        correlationId: 'task4-rollback',
        payload: { token: 'SECRET_SENTINEL', status: 'INVITED' },
      });
      throw new Error('ROLLBACK_SENTINEL');
    })).rejects.toThrow('ROLLBACK_SENTINEL');

    expect(await database!.user.findUnique({ where: { email } })).toBeNull();

    const created = await command.run(async (tx) => {
      const user = await tx.user.create({ data: { displayName: 'Task 4 success', email: `ok-${email}` } });
      return outbox.append(tx, {
        eventType: 'test.created',
        aggregateType: 'User',
        aggregateId: user.id,
        idempotencyKey: `task4-replay-${randomUUID()}`,
        correlationId: 'task4-replay',
        payload: { token: 'SECRET_SENTINEL', status: 'INVITED' },
      });
    });
    expect(JSON.stringify(created.payload)).not.toContain('SECRET_SENTINEL');

    let attempts = 0;
    const dispatcher = new OutboxDispatcher(database!, {
      publish: async (event) => {
        if (event.id !== created.id) return;
        attempts += 1;
        if (attempts === 1) throw new Error('transient SECRET_SENTINEL');
      },
    });
    await dispatcher.dispatchBatch();
    expect((await database!.outboxEvent.findUnique({ where: { id: created.id } }))?.state).toBe('RETRY');
    await dispatcher.dispatchBatch();
    expect((await database!.outboxEvent.findUnique({ where: { id: created.id } }))?.state).toBe('COMPLETED');
    expect(attempts).toBe(2);
  });
});
