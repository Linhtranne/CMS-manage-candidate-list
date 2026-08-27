import { describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../src/modules/identity-access/http/auth.controller.js';
import { OidcValidationError } from '../../src/modules/identity-access/infrastructure/oidc.adapter.js';

const config = {
  http: { appOrigin: 'http://localhost:3000' },
  security: { secureCookies: false },
} as never;

function response() {
  return { cookie: vi.fn(), redirect: vi.fn() };
}

const createdSession = {
  sessionToken: 'session-token',
  csrfToken: 'csrf-token',
  expiresAt: new Date('2026-08-24T00:00:00.000Z'),
  user: { id: 'user-1' },
};

describe('OIDC browser callback', () => {
  it('sets the session cookies and redirects to the validated return path', async () => {
    const oidc = {
      complete: vi.fn().mockResolvedValue({ claims: { issuer: 'https://accounts.google.com', subject: 'google-subject', audience: 'client', nonce: 'nonce' }, returnTo: '/work' }),
    };
    const sessions = {
      establishFromOidc: vi.fn().mockResolvedValue({
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        expiresAt: new Date('2026-08-24T00:00:00.000Z'),
        user: { id: 'user-1' },
      }),
    };
    const httpResponse = response();

    await new AuthController(oidc as never, sessions as never, config).completeOidc('code', 'state', httpResponse as never);

    expect(httpResponse.cookie).toHaveBeenCalledTimes(2);
    expect(httpResponse.redirect).toHaveBeenCalledWith(303, 'http://localhost:3000/work');
  });

  it('redirects callback failures to login without exposing provider details', async () => {
    const oidc = { complete: vi.fn().mockRejectedValue(new OidcValidationError('OIDC_DISCOVERY_FAILED', 'provider failed')) };
    const httpResponse = response();

    await new AuthController(oidc as never, {} as never, config).completeOidc('code', 'state', httpResponse as never);

    expect(httpResponse.redirect).toHaveBeenCalledWith(303, 'http://localhost:3000/login?oidc_error=OIDC_DISCOVERY_FAILED');
  });

  it('keeps unexpected server failures on the API error path', async () => {
    const oidc = { complete: vi.fn().mockRejectedValue(new Error('database unavailable')) };
    const httpResponse = response();

    await expect(new AuthController(oidc as never, {} as never, config).completeOidc('code', 'state', httpResponse as never)).rejects.toThrow('database unavailable');
    expect(httpResponse.redirect).not.toHaveBeenCalled();
  });
});

describe('password login', () => {
  it('authenticates credentials, sets session cookies and returns the session envelope', async () => {
    const sessions = { authenticateWithPassword: vi.fn().mockResolvedValue(createdSession) };
    const httpResponse = response();

    const result = await new AuthController({} as never, sessions as never, config).login({ email: 'Admin@localhost', password: 'secret' }, httpResponse as never);

    expect(sessions.authenticateWithPassword).toHaveBeenCalledWith('Admin@localhost', 'secret');
    expect(httpResponse.cookie).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ user: createdSession.user, expiresAt: createdSession.expiresAt });
  });
});
