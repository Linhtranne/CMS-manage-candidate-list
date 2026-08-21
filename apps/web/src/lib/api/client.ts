import createClient from 'openapi-fetch';
import type { paths } from '@cms/contracts';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseWithJson(response: Response, payload: unknown): Response {
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function normalizeApiResponse(response: Response): Promise<Response> {
  if (response.status === 204 || !response.headers.get('content-type')?.includes('application/json')) {
    return response;
  }

  let payload: unknown;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  if (!isRecord(payload)) return response;

  if ('data' in payload && 'requestId' in payload) {
    const data = payload.data;
    const page = payload.page;
    if (isRecord(data) && isRecord(page) && 'nextCursor' in page) {
      return responseWithJson(response, { ...data, nextCursor: page.nextCursor });
    }
    return responseWithJson(response, data);
  }

  if ('error' in payload && 'requestId' in payload && isRecord(payload.error)) {
    const messageKey = typeof payload.error.messageKey === 'string' ? payload.error.messageKey : 'errors.unknown';
    return responseWithJson(response, {
      ...payload.error,
      message: messageKey,
      traceId: payload.requestId
    });
  }

  return response;
}

const apiOrigin =
  typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000')
    : window.location.origin;

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const apiBaseUrl = (configuredApiBaseUrl || `${apiOrigin}/api/v1`).replace(/\/$/, '');

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
  fetch: async (input: Request) => normalizeApiResponse(await globalThis.fetch(input, { credentials: 'include' }))
});
