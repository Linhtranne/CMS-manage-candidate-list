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
const localApiBaseUrl = 'http://localhost:3100/api/v1';
const fallbackApiBaseUrl = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? localApiBaseUrl
  : `${apiOrigin}/api/v1`;
export const apiBaseUrl = (configuredApiBaseUrl || fallbackApiBaseUrl).replace(/\/$/, '');

function readCsrfToken() {
  if (typeof document === 'undefined') return undefined;
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith('cms_csrf='));
  return entry ? decodeURIComponent(entry.slice('cms_csrf='.length)) : undefined;
}

let csrfTokenPromise: Promise<string | undefined> | undefined;

async function getCsrfToken() {
  const cookieToken = readCsrfToken();
  if (cookieToken) return cookieToken;
  if (typeof window === 'undefined') return undefined;
  csrfTokenPromise ??= globalThis.fetch(`${apiBaseUrl}/auth/csrf`, { credentials: 'include' })
    .then((response) => normalizeApiResponse(response))
    .then(async (response) => {
      if (!response.ok) return undefined;
      const payload = await response.json() as { token?: unknown };
      return typeof payload.token === 'string' ? payload.token : undefined;
    })
    .catch(() => undefined)
    .finally(() => { csrfTokenPromise = undefined; });
  return csrfTokenPromise;
}

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
  fetch: async (input: Request) => {
    const method = input.method.toUpperCase();
    const csrfToken = input.url.endsWith('/auth/login') ? undefined : await getCsrfToken();
    const headers = new Headers(input.headers);
    if (csrfToken && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', csrfToken);
    }
    return normalizeApiResponse(await globalThis.fetch(new Request(input, { headers }), { credentials: 'include' }));
  }
});
