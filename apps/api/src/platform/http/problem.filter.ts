import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { getRequestContext, requestIdFrom } from './request-context.middleware.js';
import { redactStructuredValue } from '../security/redaction.js';

export interface ErrorEnvelope {
  error: {
    code: string;
    messageKey: string;
    params?: Record<string, unknown>;
    fieldErrors?: Record<string, string[]>;
    currentVersion?: number;
  };
  requestId: string;
}

function statusCode(exception: unknown): number {
  if (typeof exception === 'object' && exception && 'statusCode' in exception && typeof exception.statusCode === 'number') {
    return exception.statusCode;
  }
  if (exception instanceof HttpException) return exception.getStatus();
  return 500;
}

function knownProblem(exception: unknown): Partial<ErrorEnvelope['error']> {
  if (typeof exception !== 'object' || !exception) return {};
  const candidate = exception as Record<string, unknown>;
  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    messageKey: typeof candidate.messageKey === 'string' ? candidate.messageKey : undefined,
    params: candidate.params && typeof candidate.params === 'object'
      ? redactStructuredValue(candidate.params) as Record<string, unknown>
      : undefined,
    fieldErrors: candidate.fieldErrors && typeof candidate.fieldErrors === 'object'
      ? redactStructuredValue(candidate.fieldErrors) as Record<string, string[]>
      : undefined,
    currentVersion: typeof candidate.currentVersion === 'number' ? candidate.currentVersion : undefined,
  };
}

function fallbackCode(status: number): string {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  return 'INTERNAL_ERROR';
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const status = statusCode(exception);
    const known = knownProblem(exception);
    const body: ErrorEnvelope = {
      error: {
        code: known.code ?? fallbackCode(status),
        messageKey: known.messageKey ?? (status >= 500 ? 'errors.internal' : 'errors.requestRejected'),
        ...(known.params ? { params: known.params } : {}),
        ...(known.fieldErrors ? { fieldErrors: known.fieldErrors } : {}),
        ...(known.currentVersion !== undefined ? { currentVersion: known.currentVersion } : {}),
      },
      requestId: getRequestContext()?.requestId ?? requestIdFrom(request),
    };
    response.setHeader?.('x-request-id', body.requestId);
    response.status(status).json(body);
  }
}
