import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { NestMiddleware } from '@nestjs/common';

export interface RequestContextValue {
  requestId: string;
  correlationId: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContextValue>();
const SAFE_ID = /^[A-Za-z0-9._:-]{1,120}$/;

function headerValue(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' && SAFE_ID.test(candidate) ? candidate : undefined;
}

export function getRequestContext(): RequestContextValue | undefined {
  return storage.getStore();
}

export function requestIdFrom(request: Request): string {
  return headerValue(request, 'x-request-id') ?? `req_${randomUUID()}`;
}

export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = requestIdFrom(request);
    const correlationId = headerValue(request, 'x-correlation-id') ?? requestId;
    const context: RequestContextValue = { requestId, correlationId, startedAt: Date.now() };
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);
    storage.run(context, next);
  }
}
