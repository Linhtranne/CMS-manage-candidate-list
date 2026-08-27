import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { getRequestContext, requestIdFrom } from './request-context.middleware.js';

export interface SuccessEnvelope<T> {
  data: T;
  page?: unknown;
  requestId: string;
}

function isEnvelope(value: unknown): value is SuccessEnvelope<unknown> {
  return Boolean(value && typeof value === 'object' && 'data' in value && 'requestId' in value);
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessEnvelope<unknown>> {
    const request = context.switchToHttp().getRequest();
    const requestId = getRequestContext()?.requestId ?? requestIdFrom(request);
    return next.handle().pipe(
      map((data: unknown) => {
        if (isEnvelope(data)) return data;
        return { data, requestId };
      }),
    );
  }
}
