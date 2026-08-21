import { readFileSync } from 'node:fs';

export type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';
export type MailProvider = 'DISABLED' | 'MICROSOFT_GRAPH' | 'GMAIL_API' | 'SMTP_IMAP';

export interface ConfigIssue {
  field: string;
  message: string;
}

export class ConfigValidationError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    super(`Invalid runtime configuration: ${issues.map((issue) => issue.field).join(', ')}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export interface RuntimeConfig {
  nodeEnv: NodeEnvironment;
  http: {
    host: string;
    port: number;
    appOrigin: string;
    corsOrigins: string[];
  };
  database: {
    url: string;
    poolMax: number;
    connectTimeoutMs: number;
    statementTimeoutMs: number;
  };
  redis: {
    url: string;
  };
  queue: {
    enabled: boolean;
    prefix: string;
    names: string[];
    concurrency: number;
  };
  telemetry: {
    serviceName: string;
    enabled: boolean;
  };
  oidc: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    clientSecret: string | null;
    redirectUri: string | null;
    audience: string | null;
  };
  catalog: {
    approvalRecordFile: string | null;
  };
  security: {
    encryptionKey: string;
    sessionSecret: string;
    secureCookies: boolean;
  };
  mail: {
    provider: MailProvider;
    enabled: boolean;
    approvalFile: string | null;
    approved: boolean;
  };
}

const DEFAULTS = {
  appOrigin: 'http://localhost:3000',
  databaseUrl: 'postgresql://localhost:5432/cms_candidate_supply',
  redisUrl: 'redis://localhost:6379',
  encryptionKey: 'development-only-encryption-key-32',
  sessionSecret: 'development-only-session-secret-32',
} as const;

function value(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const candidate = env[key]?.trim();
  return candidate || undefined;
}

function isUrl(candidate: string | undefined, schemes: readonly string[]): candidate is string {
  if (!candidate) return false;
  try {
    return schemes.includes(new URL(candidate).protocol.replace(':', ''));
  } catch {
    return false;
  }
}

function issue(issues: ConfigIssue[], field: string, message: string): void {
  issues.push({ field, message });
}

function requiredSecret(
  env: NodeJS.ProcessEnv,
  key: string,
  required: boolean,
  issues: ConfigIssue[],
  fallback: string,
): string {
  const candidate = value(env, key) ?? (!required ? fallback : undefined);
  if (!candidate) {
    issue(issues, key, 'is required outside local development');
    return '';
  }
  if (candidate.length < 32) issue(issues, key, 'must be at least 32 characters');
  return candidate;
}

function parseEnvironment(raw: string | undefined, issues: ConfigIssue[]): NodeEnvironment {
  const candidate = raw ?? 'development';
  if (candidate === 'development' || candidate === 'test' || candidate === 'staging' || candidate === 'production') {
    return candidate;
  }
  issue(issues, 'NODE_ENV', 'must be development, test, staging, or production');
  return 'development';
}

function parsePort(raw: string | undefined, issues: ConfigIssue[]): number {
  const port = Number(raw ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    issue(issues, 'PORT', 'must be an integer between 1 and 65535');
    return 3000;
  }
  return port;
}

function parseBoundedInteger(
  raw: string | undefined,
  field: string,
  fallback: number,
  min: number,
  max: number,
  issues: ConfigIssue[],
): number {
  const candidate = Number(raw ?? fallback);
  if (!Number.isInteger(candidate) || candidate < min || candidate > max) {
    issue(issues, field, `must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return candidate;
}

function parseCorsOrigins(raw: string | undefined, issues: ConfigIssue[], fallback: string): string[] {
  const origins = (raw ?? fallback).split(',').map((origin) => origin.trim()).filter(Boolean);
  for (const origin of origins) {
    if (!isUrl(origin, ['http', 'https'])) issue(issues, 'CORS_ORIGINS', `invalid origin: ${origin}`);
  }
  return origins;
}

function parseBoolean(raw: string | undefined, field: string, fallback: boolean, issues: ConfigIssue[]): boolean {
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  issue(issues, field, 'must be true or false');
  return fallback;
}

function isRecord(valueToCheck: unknown): valueToCheck is Record<string, unknown> {
  return Boolean(valueToCheck) && typeof valueToCheck === 'object' && !Array.isArray(valueToCheck);
}

function approvalScopeAllows(scope: unknown, nodeEnv: NodeEnvironment): boolean {
  const scopes = Array.isArray(scope) ? scope : [scope];
  return scopes.some((entry) => entry === nodeEnv || entry === 'staging-and-production');
}

function readOidcApprovalRecord(
  path: string | undefined,
  nodeEnv: NodeEnvironment,
  issues: ConfigIssue[],
): boolean {
  if (!path) return false;

  let record: unknown;
  try {
    record = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'must be a readable JSON approval record');
    return false;
  }

  if (!isRecord(record)) {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'must contain an approval object');
    return false;
  }

  let valid = true;
  if (record.id !== 'DEC-002') {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'id must be DEC-002');
    valid = false;
  }
  if (record.status !== 'approved') {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'status must be approved');
    valid = false;
  }
  if (typeof record.version !== 'string' || !record.version.trim()) {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'version is required');
    valid = false;
  }
  if (typeof record.artifact_checksum !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(record.artifact_checksum)) {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', 'artifact_checksum must use sha256:<64-hex-digest>');
    valid = false;
  }
  if (!approvalScopeAllows(record.scope, nodeEnv)) {
    issue(issues, 'OIDC_APPROVAL_RECORD_FILE', `scope must include ${nodeEnv}`);
    valid = false;
  }

  const approvals = Array.isArray(record.approvals) ? record.approvals.filter(isRecord) : [];
  for (const role of ['Security Owner', 'IT Identity Owner']) {
    const approval = approvals.find((candidate) => candidate.role === role);
    if (!approval || typeof approval.identity !== 'string' || !approval.identity.trim() || approval.identity.includes('<')
      || typeof approval.at !== 'string' || Number.isNaN(Date.parse(approval.at))) {
      issue(issues, 'OIDC_APPROVAL_RECORD_FILE', `${role} approval identity and timestamp are required`);
      valid = false;
    }
  }

  return valid;
}

function readMailApprovalRecord(path: string | undefined, nodeEnv: NodeEnvironment, provider: MailProvider, issues: ConfigIssue[]): boolean {
  if (!path) {
    issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'is required when MAIL_PROVIDER is enabled');
    return false;
  }
  let record: unknown;
  try {
    record = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'must be a readable JSON approval record');
    return false;
  }
  if (!isRecord(record)) {
    issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'must contain an approval object');
    return false;
  }
  let valid = true;
  if (record.id !== 'DEC-003') { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'id must be DEC-003'); valid = false; }
  if (record.status !== 'approved') { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'status must be approved'); valid = false; }
  if (typeof record.version !== 'string' || !record.version.trim()) { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'version is required'); valid = false; }
  if (typeof record.artifact_checksum !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(record.artifact_checksum)) { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', 'artifact_checksum must use sha256:<64-hex-digest>'); valid = false; }
  if (!approvalScopeAllows(record.scope, nodeEnv)) { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', `scope must include ${nodeEnv}`); valid = false; }
  const approvedProvider = typeof record.provider === 'string' ? record.provider : typeof record.selected_provider === 'string' ? record.selected_provider : undefined;
  if (!approvedProvider || approvedProvider !== provider) { issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', `provider must match ${provider}`); valid = false; }
  const approvals = Array.isArray(record.approvals) ? record.approvals.filter(isRecord) : [];
  for (const role of ['Security Owner', 'Business Owner']) {
    const approval = approvals.find((candidate) => candidate.role === role);
    if (!approval || typeof approval.identity !== 'string' || !approval.identity.trim() || approval.identity.includes('<') || typeof approval.at !== 'string' || Number.isNaN(Date.parse(approval.at))) {
      issue(issues, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE', `${role} approval identity and timestamp are required`);
      valid = false;
    }
  }
  return valid;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const issues: ConfigIssue[] = [];
  const nodeEnv = parseEnvironment(value(env, 'NODE_ENV'), issues);
  const strictSecrets = nodeEnv === 'production' || nodeEnv === 'staging';
  const appOrigin = value(env, 'APP_ORIGIN') ?? (!strictSecrets ? DEFAULTS.appOrigin : undefined);
  const databaseUrl = value(env, 'DATABASE_URL') ?? (!strictSecrets ? DEFAULTS.databaseUrl : undefined);
  const redisUrl = value(env, 'REDIS_URL') ?? (!strictSecrets ? DEFAULTS.redisUrl : undefined);

  if (!appOrigin) issue(issues, 'APP_ORIGIN', 'is required outside local development');
  else if (!isUrl(appOrigin, ['http', 'https'])) issue(issues, 'APP_ORIGIN', 'must be a valid http(s) URL');

  if (!databaseUrl) issue(issues, 'DATABASE_URL', 'is required outside local development');
  else if (!isUrl(databaseUrl, ['postgres', 'postgresql'])) issue(issues, 'DATABASE_URL', 'must be a valid postgres URL');

  if (!redisUrl) issue(issues, 'REDIS_URL', 'is required outside local development');
  else if (!isUrl(redisUrl, ['redis', 'rediss'])) issue(issues, 'REDIS_URL', 'must be a valid redis URL');

  const oidcIssuer = value(env, 'OIDC_ISSUER');
  const oidcClientId = value(env, 'OIDC_CLIENT_ID');
  const oidcClientSecret = value(env, 'OIDC_CLIENT_SECRET');
  const oidcRedirectUri = value(env, 'OIDC_REDIRECT_URI');
  const oidcAudience = value(env, 'OIDC_AUDIENCE');
  const oidcValues: Array<[string, string | undefined]> = [
    ['OIDC_ISSUER', oidcIssuer],
    ['OIDC_CLIENT_ID', oidcClientId],
    ['OIDC_CLIENT_SECRET', oidcClientSecret],
    ['OIDC_REDIRECT_URI', oidcRedirectUri],
    ['OIDC_AUDIENCE', oidcAudience],
  ];
  const oidcConfigured = oidcValues.every(([, candidate]) => Boolean(candidate));
  const oidcPartiallyConfigured = oidcValues.some(([, candidate]) => Boolean(candidate)) && !oidcConfigured;
  if (oidcPartiallyConfigured) issue(issues, 'OIDC_CONFIG', 'OIDC settings must be provided together');
  if (oidcIssuer && !isUrl(oidcIssuer, ['http', 'https'])) issue(issues, 'OIDC_ISSUER', 'must be a valid http(s) URL');
  if (strictSecrets && oidcIssuer && !oidcIssuer.startsWith('https://')) issue(issues, 'OIDC_ISSUER', 'must use https in staging/production');
  if (oidcRedirectUri && !isUrl(oidcRedirectUri, ['http', 'https'])) issue(issues, 'OIDC_REDIRECT_URI', 'must be a valid http(s) URL');
  if (strictSecrets && oidcRedirectUri && !oidcRedirectUri.startsWith('https://')) issue(issues, 'OIDC_REDIRECT_URI', 'must use https in staging/production');
  const oidcApprovalFile = value(env, 'OIDC_APPROVAL_RECORD_FILE');
  const oidcApproved = !strictSecrets || readOidcApprovalRecord(oidcApprovalFile, nodeEnv, issues);

  const encryptionKey = requiredSecret(env, 'ENCRYPTION_KEY', strictSecrets, issues, DEFAULTS.encryptionKey);
  const sessionSecret = requiredSecret(env, 'SESSION_SECRET', strictSecrets, issues, DEFAULTS.sessionSecret);
  const rawMailProvider = value(env, 'MAIL_PROVIDER') ?? 'DISABLED';
  const mailProviders: readonly MailProvider[] = ['DISABLED', 'MICROSOFT_GRAPH', 'GMAIL_API', 'SMTP_IMAP'];
  if (!mailProviders.includes(rawMailProvider as MailProvider)) issue(issues, 'MAIL_PROVIDER', 'is not supported');
  const mailProvider = mailProviders.includes(rawMailProvider as MailProvider) ? rawMailProvider as MailProvider : 'DISABLED';
  const mailApprovalFile = value(env, 'MAIL_PROVIDER_APPROVAL_RECORD_FILE');
  const mailApproved = mailProvider === 'DISABLED' || readMailApprovalRecord(mailApprovalFile, nodeEnv, mailProvider, issues);
  const secureCookies = value(env, 'COOKIE_SECURE') ? value(env, 'COOKIE_SECURE') === 'true' : strictSecrets;
  if (strictSecrets && !secureCookies) issue(issues, 'COOKIE_SECURE', 'must be true in staging/production');
  const corsFallback = isUrl(appOrigin, ['http', 'https']) ? appOrigin : DEFAULTS.appOrigin;
  const corsOrigins = parseCorsOrigins(value(env, 'CORS_ORIGINS'), issues, corsFallback);
  const queueEnabled = parseBoolean(value(env, 'QUEUE_ENABLED'), 'QUEUE_ENABLED', false, issues);
  if (strictSecrets && queueEnabled) issue(issues, 'QUEUE_ENABLED', 'cannot be enabled until a production consumer handler is registered');
  const telemetryEnabled = parseBoolean(value(env, 'OTEL_ENABLED'), 'OTEL_ENABLED', strictSecrets, issues);
  const queueNames = (value(env, 'QUEUE_NAMES') ?? 'outbox,reconcile,mail-ingest,mail-sync,file-scan').split(',').map((name) => name.trim()).filter(Boolean);
  if (!queueNames.length) issue(issues, 'QUEUE_NAMES', 'must contain at least one queue name');
  const queuePrefix = value(env, 'QUEUE_PREFIX') ?? 'cms';
  const queueConcurrency = parseBoundedInteger(value(env, 'QUEUE_CONCURRENCY'), 'QUEUE_CONCURRENCY', 5, 1, 100, issues);
  const port = parsePort(value(env, 'PORT'), issues);
  const poolMax = parseBoundedInteger(value(env, 'DB_POOL_MAX'), 'DB_POOL_MAX', 10, 1, 100, issues);
  const connectTimeoutMs = parseBoundedInteger(
    value(env, 'DB_CONNECT_TIMEOUT_MS'),
    'DB_CONNECT_TIMEOUT_MS',
    5_000,
    100,
    60_000,
    issues,
  );
  const statementTimeoutMs = parseBoundedInteger(
    value(env, 'DB_STATEMENT_TIMEOUT_MS'),
    'DB_STATEMENT_TIMEOUT_MS',
    10_000,
    100,
    120_000,
    issues,
  );

  if (issues.length) throw new ConfigValidationError(issues);

  return {
    nodeEnv,
    http: {
      host: value(env, 'HOST') ?? '0.0.0.0',
      port,
      appOrigin: appOrigin ?? DEFAULTS.appOrigin,
      corsOrigins,
    },
    database: { url: databaseUrl ?? DEFAULTS.databaseUrl, poolMax, connectTimeoutMs, statementTimeoutMs },
    redis: { url: redisUrl ?? DEFAULTS.redisUrl },
    queue: { enabled: queueEnabled, prefix: queuePrefix, names: queueNames, concurrency: queueConcurrency },
    telemetry: {
      serviceName: value(env, 'OTEL_SERVICE_NAME') ?? 'cms-candidate-supply-api',
      enabled: telemetryEnabled,
    },
    oidc: {
      enabled: oidcConfigured && oidcApproved,
      issuer: oidcIssuer ?? null,
      clientId: oidcClientId ?? null,
      clientSecret: oidcClientSecret ?? null,
      redirectUri: oidcRedirectUri ?? null,
      audience: oidcAudience ?? null,
    },
    catalog: {
      approvalRecordFile: value(env, 'CATALOG_APPROVAL_RECORD_FILE') ?? null,
    },
    security: { encryptionKey, sessionSecret, secureCookies },
    mail: { provider: mailProvider, enabled: mailProvider !== 'DISABLED' && mailApproved, approvalFile: mailApprovalFile ?? null, approved: mailApproved },
  };
}
