import createClient from 'openapi-fetch';
import type { paths } from '@cms/contracts';

const apiOrigin =
  typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000')
    : window.location.origin;

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const apiBaseUrl = (configuredApiBaseUrl || `${apiOrigin}/api/v1`).replace(/\/$/, '');

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
  fetch: (input: Request) => globalThis.fetch(input, { credentials: 'include' })
});
