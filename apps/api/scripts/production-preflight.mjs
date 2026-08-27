import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digestFromImageRef } from './image-reference.mjs';
import { validateReleaseApprovalArtifact } from './release-approval.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const scope = process.env.RELEASE_SCOPE ?? 'phase-1a';
const requiredDecisions = {
  'phase-1a': ['DEC-001', 'DEC-002', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
  'phase-1b': ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
  full: ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
}[scope];
const requiredRoles = ['Backend Tech Lead', 'Product Owner', 'QA Lead', 'Security Owner', 'Operations Owner'];
const digestPattern = /^sha256:[0-9a-f]{64}$/i;
const checks = [];
const missing = [];
const failures = [];

function env(name) {
  const value = process.env[name]?.trim();
  if (!value) missing.push(name);
  return value;
}
function check(name, passed, detail) {
  checks.push({ name, status: passed ? 'passed' : 'failed', ...(detail ? { detail } : {}) });
  if (!passed) failures.push(name);
}
function command(name, args) {
  try {
    return execFileSync(name, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

const apiImage = env('API_IMAGE');
const migrationImage = env('MIGRATION_IMAGE');
const webImage = env('WEB_IMAGE');
const postgresImage = env('POSTGRES_IMAGE');
const redisImage = env('REDIS_IMAGE');
const appVersion = env('APP_VERSION');
const appOrigin = env('APP_ORIGIN');
const corsOrigins = env('CORS_ORIGINS');
const databaseUrl = env('DATABASE_URL');
const databaseRuntimeRole = env('DATABASE_RUNTIME_ROLE');
const redisUrl = env('REDIS_URL');
const encryptionKey = env('ENCRYPTION_KEY');
const sessionSecret = env('SESSION_SECRET');
const approvalFile = env('RELEASE_APPROVALS_FILE');
const securityArtifactFiles = {
  sast: env('SAST_ARTIFACT'),
  dependency: env('DEPENDENCY_SCAN_ARTIFACT'),
  secret: env('SECRET_SCAN_ARTIFACT'),
  container: env('CONTAINER_SCAN_ARTIFACT'),
  sbom: env('SBOM_ARTIFACT'),
  dast: env('DAST_ARTIFACT'),
};
const apiDigest = env('IMAGE_DIGEST');
const migrationDigest = env('MIGRATION_IMAGE_DIGEST');
const webDigest = env('WEB_IMAGE_DIGEST');
const postgresDigest = env('POSTGRES_IMAGE_DIGEST');
const redisDigest = env('REDIS_IMAGE_DIGEST');

if (!requiredDecisions) failures.push('RELEASE_SCOPE');
check('release-scope', Boolean(requiredDecisions), 'scope must be phase-1a, phase-1b or full');
for (const [name, value] of [['API_IMAGE', apiImage], ['MIGRATION_IMAGE', migrationImage], ['WEB_IMAGE', webImage], ['POSTGRES_IMAGE', postgresImage], ['REDIS_IMAGE', redisImage]]) {
  check(`${name}-pinned`, Boolean(value && /@sha256:[0-9a-f]{64}$/i.test(value)), 'image must use @sha256:<64-hex-digest>');
}
for (const [name, value] of [['IMAGE_DIGEST', apiDigest], ['MIGRATION_IMAGE_DIGEST', migrationDigest], ['WEB_IMAGE_DIGEST', webDigest], ['POSTGRES_IMAGE_DIGEST', postgresDigest], ['REDIS_IMAGE_DIGEST', redisDigest]]) {
  check(`${name}-valid`, Boolean(value && digestPattern.test(value)), 'digest must be sha256:<64-hex-digest>');
}
for (const [name, image, digest] of [
  ['API_IMAGE', apiImage, apiDigest],
  ['MIGRATION_IMAGE', migrationImage, migrationDigest],
  ['WEB_IMAGE', webImage, webDigest],
  ['POSTGRES_IMAGE', postgresImage, postgresDigest],
  ['REDIS_IMAGE', redisImage, redisDigest],
]) {
  check(`${name}-digest-match`, Boolean(digest && digestFromImageRef(image) === digest.toLowerCase()), 'image reference digest must match the corresponding *_IMAGE_DIGEST');
}
check('production-env', process.env.NODE_ENV === 'production', 'NODE_ENV must be production');
check('required-runtime-inputs', [appVersion, appOrigin, corsOrigins, databaseUrl, databaseRuntimeRole, redisUrl, encryptionKey, sessionSecret].every(Boolean));
let databaseUrlRole = null;
try {
  databaseUrlRole = databaseUrl ? decodeURIComponent(new URL(databaseUrl).username) : null;
} catch {
  databaseUrlRole = null;
}
check('database-runtime-role-not-cms-api', databaseRuntimeRole !== 'cms_api', 'cms_api is the NOLOGIN schema owner role and cannot be used by the runtime');
check('database-runtime-role-match', Boolean(databaseRuntimeRole && databaseUrlRole && databaseRuntimeRole === databaseUrlRole), 'DATABASE_RUNTIME_ROLE must match the username in DATABASE_URL');
for (const [name, file] of Object.entries(securityArtifactFiles)) {
  let readable = false;
  if (file) {
    try { readable = readFileSync(resolve(root, file), 'utf8').trim().length > 0; } catch { readable = false; }
  }
  check(`${name}-artifact-readable`, readable, `${name} scan artifact must be a readable non-empty file`);
}

let approvalRecord = null;
if (approvalFile) {
  try {
    approvalRecord = JSON.parse(readFileSync(resolve(root, approvalFile), 'utf8'));
  } catch {
    failures.push('approval-artifact-readable');
  }
}
const approvedDecisions = new Set((approvalRecord?.decisions ?? []).filter((item) => item?.status === 'approved').map((item) => item?.id));
const approvalArtifactIssues = validateReleaseApprovalArtifact(approvalRecord, requiredDecisions ?? [], requiredRoles);
check('approval-artifact-shape', approvalArtifactIssues.length === 0, approvalArtifactIssues.join('; '));
check('approved-decisions', Boolean(approvalRecord) && requiredDecisions.every((id) => approvedDecisions.has(id)), `required=${requiredDecisions.join(',')}`);
const approvals = Array.isArray(approvalRecord?.approvals) ? approvalRecord.approvals : [];
check('approved-roles', requiredRoles.every((role) => approvals.some((item) => item?.role === role && item?.status === 'approved' && item?.identity && item?.at)), `required=${requiredRoles.join(',')}`);

const activationFlags = [
  ['PRODUCTION_SEED_ACTIVATION', 'DEC-004'],
  ['DOCUMENTS_ENABLED', 'DEC-005'],
  ['BULK_EXPORT_ENABLED', 'DEC-005'],
  ['PURGE_ENABLED', 'DEC-005'],
  ['BREAK_GLASS_ENABLED', 'DEC-001'],
];
for (const [flag, decisionId] of activationFlags) {
  const requested = process.env[flag] === 'true';
  check(`${flag}-approval`, !requested || approvedDecisions.has(decisionId), `${flag}=true requires approved ${decisionId}`);
}

const gitStatus = command('git', ['status', '--porcelain']);
check('clean-worktree', gitStatus === '');
const compose = command('docker', ['compose', '--profile', 'queue', '--profile', 'migration', '-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml', 'config', '--quiet']);
check('production-compose-config', compose !== null);

const result = {
  status: missing.length || failures.length ? 'preflight_blocked' : 'preflight_passed',
  scope,
  missing,
  failed_checks: failures,
  checks,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'preflight_passed' ? 0 : 2);
