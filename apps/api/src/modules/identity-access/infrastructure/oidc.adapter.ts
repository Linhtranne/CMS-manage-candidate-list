import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';

const STATE_TTL_MS = 5 * 60 * 1000;
export const OIDC_FETCH = Symbol('OIDC_FETCH');

export interface OidcClaims {
  issuer: string;
  subject: string;
  audience: string | string[];
  nonce: string;
  email?: string;
  name?: string;
}

export interface OidcLoginStart {
  redirectUrl: string;
}

export interface OidcLoginCompletion {
  claims: OidcClaims;
  returnTo: string;
}

interface StatePayload {
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  issuedAt: number;
}

interface DiscoveryDocument {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
}

export class OidcValidationError extends Error {
  statusCode = 401;
  readonly code: string;
  readonly messageKey = 'errors.oidcInvalid';

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OidcValidationError';
    this.code = code;
  }
}

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function base64url(value: Buffer): string {
  return value.toString('base64url');
}

function seal(payload: StatePayload, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [base64url(iv), base64url(ciphertext), base64url(cipher.getAuthTag())].join('.');
}

function open(token: string, secret: string): StatePayload {
  try {
    const [ivPart, ciphertextPart, tagPart] = token.split('.');
    if (!ivPart || !ciphertextPart || !tagPart) throw new Error('invalid state format');
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextPart, 'base64url')), decipher.final()]).toString('utf8');
    const payload = JSON.parse(plaintext) as StatePayload;
    if (!payload.nonce || !payload.codeVerifier || !payload.returnTo || !Number.isFinite(payload.issuedAt)) throw new Error('invalid state payload');
    return payload;
  } catch {
    throw new OidcValidationError('OIDC_STATE_INVALID', 'OIDC state is invalid');
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeReturnTo(returnTo: string | undefined): string {
  const candidate = returnTo?.trim() || '/';
  if (!candidate.startsWith('/') || candidate.startsWith('//')) throw new OidcValidationError('OPEN_REDIRECT_REJECTED', 'returnTo must be a local path');
  try {
    const parsed = new URL(candidate, 'http://local.invalid');
    if (parsed.origin !== 'http://local.invalid') throw new Error('external origin');
  } catch {
    throw new OidcValidationError('OPEN_REDIRECT_REJECTED', 'returnTo must be a local path');
  }
  return candidate;
}

@Injectable()
export class OidcAdapter {
  private readonly usedStates = new Set<string>();

  constructor(
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
    private readonly prisma: PrismaService,
    @Inject(OIDC_FETCH) private readonly fetchImpl: typeof fetch,
  ) {}

  async start(returnTo?: string): Promise<OidcLoginStart> {
    this.assertEnabled();
    const discovery = await this.discovery();
    const safePath = safeReturnTo(returnTo);
    const nonce = base64url(randomBytes(32));
    const codeVerifier = base64url(randomBytes(32));
    const state = seal({ nonce, codeVerifier, returnTo: safePath, issuedAt: Date.now() }, this.config.security.encryptionKey);
    if (this.prisma.oidcLoginState?.create) {
      await this.prisma.oidcLoginState.create({ data: { stateHash: sha256(state), expiresAt: new Date(Date.now() + STATE_TTL_MS) } });
    }
    const challenge = base64url(createHash('sha256').update(codeVerifier).digest());
    const url = new URL(discovery.authorization_endpoint!);
    url.searchParams.set('client_id', this.config.oidc.clientId!);
    url.searchParams.set('redirect_uri', this.config.oidc.redirectUri!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return { redirectUrl: url.toString() };
  }

  async complete(code: string, state: string): Promise<OidcLoginCompletion> {
    this.assertEnabled();
    if (!code || !state) throw new OidcValidationError('OIDC_CALLBACK_INVALID', 'OIDC callback requires code and state');
    const payload = open(state, this.config.security.encryptionKey);
    if (Date.now() - payload.issuedAt > STATE_TTL_MS) throw new OidcValidationError('OIDC_STATE_EXPIRED', 'OIDC state expired');
    await this.consumeState(state);
    const discovery = await this.discovery();
    const tokenResponse = await this.fetchImpl(discovery.token_endpoint!, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.oidc.clientId!,
        client_secret: this.config.oidc.clientSecret!,
        redirect_uri: this.config.oidc.redirectUri!,
        code,
        code_verifier: payload.codeVerifier,
      }),
    });
    if (!tokenResponse.ok) throw new OidcValidationError('OIDC_TOKEN_EXCHANGE_FAILED', 'OIDC token exchange failed');
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) throw new OidcValidationError('OIDC_ID_TOKEN_MISSING', 'OIDC id token missing');
    const verified = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(discovery.jwks_uri!)), {
      issuer: this.config.oidc.issuer!,
      audience: this.config.oidc.audience ?? this.config.oidc.clientId!,
    });
    return { claims: this.validateClaims(verified.payload, payload.nonce), returnTo: payload.returnTo };
  }

  validateClaims(claims: JWTPayload | OidcClaims, expectedNonce: string): OidcClaims {
    const raw = claims as Record<string, unknown>;
    const issuer = typeof raw.iss === 'string' ? raw.iss : typeof raw.issuer === 'string' ? raw.issuer : undefined;
    const audience = typeof raw.aud === 'string' || Array.isArray(raw.aud) ? raw.aud as string | string[] : raw.audience as string | string[] | undefined;
    const subject = typeof raw.sub === 'string' ? raw.sub : typeof raw.subject === 'string' ? raw.subject : undefined;
    const nonce = typeof raw.nonce === 'string' ? raw.nonce : undefined;
    const expectedAudience = this.config.oidc.audience ?? this.config.oidc.clientId;
    const audiences = Array.isArray(audience) ? audience : audience ? [audience] : [];
    if (issuer !== this.config.oidc.issuer) throw new OidcValidationError('OIDC_ISSUER_MISMATCH', 'OIDC issuer mismatch');
    if (!expectedAudience || !audiences.includes(expectedAudience)) throw new OidcValidationError('OIDC_AUDIENCE_MISMATCH', 'OIDC audience mismatch');
    if (!nonce || nonce.length !== expectedNonce.length || !timingSafeEqual(Buffer.from(nonce), Buffer.from(expectedNonce))) throw new OidcValidationError('OIDC_NONCE_MISMATCH', 'OIDC nonce mismatch');
    if (!subject) throw new OidcValidationError('OIDC_SUBJECT_MISSING', 'OIDC subject missing');
    return {
      issuer,
      subject,
      audience: audience!,
      nonce,
      email: typeof raw.email === 'string' ? raw.email : undefined,
      name: typeof raw.name === 'string' ? raw.name : undefined,
    };
  }

  private assertEnabled(): void {
    if (!this.config.oidc.enabled) {
      const error = new OidcValidationError('OIDC_DISABLED', 'OIDC is not enabled for this environment');
      error.statusCode = 503;
      throw error;
    }
  }

  private async discovery(): Promise<Required<Pick<DiscoveryDocument, 'authorization_endpoint' | 'token_endpoint' | 'jwks_uri'>>> {
    const issuer = this.config.oidc.issuer!;
    const response = await this.fetchImpl(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!response.ok) throw new OidcValidationError('OIDC_DISCOVERY_FAILED', 'OIDC discovery failed');
    const document = await response.json() as DiscoveryDocument;
    if (document.issuer !== issuer || !document.authorization_endpoint || !document.token_endpoint || !document.jwks_uri) {
      throw new OidcValidationError('OIDC_DISCOVERY_INVALID', 'OIDC discovery metadata incomplete');
    }
    return document as Required<Pick<DiscoveryDocument, 'authorization_endpoint' | 'token_endpoint' | 'jwks_uri'>>;
  }

  private async consumeState(state: string): Promise<void> {
    const stateHash = sha256(state);
    if (this.prisma.oidcLoginState?.updateMany) {
      const result = await this.prisma.oidcLoginState.updateMany({
        where: { stateHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (result.count !== 1) throw new OidcValidationError('OIDC_STATE_REPLAYED', 'OIDC state already used or expired');
      return;
    }
    if (this.usedStates.has(stateHash)) throw new OidcValidationError('OIDC_STATE_REPLAYED', 'OIDC state already used');
    this.usedStates.add(stateHash);
    if (this.usedStates.size > 10_000) this.usedStates.delete(this.usedStates.values().next().value!);
  }
}
