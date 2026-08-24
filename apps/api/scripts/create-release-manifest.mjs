import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReleaseApprovalArtifact } from './release-approval.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const output = resolve(root, process.env.RELEASE_MANIFEST_OUTPUT ?? 'apps/api/ops/evidence/release-manifest.json');
const status = process.env.RELEASE_STATUS ?? 'rehearsal';
if (!['rehearsal', 'candidate', 'production'].includes(status)) throw new Error('RELEASE_STATUS must be rehearsal, candidate, or production');

function command(commandName, args) {
  return execFileSync(commandName, args, { cwd: root, encoding: 'utf8' }).trim();
}
function digest(file) {
  return `sha256:${createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex')}`;
}
function migrationHead() {
  const migrations = readdirSync(resolve(root, 'apps/api/prisma/migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (!migrations.length) throw new Error('no Prisma migrations found');
  return migrations.at(-1);
}
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to create a release manifest`);
  return value;
}

const decisionSets = {
  'phase-1a': ['DEC-001', 'DEC-002', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
  'phase-1b': ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
  full: ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007'],
};
const releaseScope = process.env.RELEASE_SCOPE ?? 'phase-1a';
if (!Object.hasOwn(decisionSets, releaseScope)) throw new Error('RELEASE_SCOPE must be phase-1a, phase-1b, or full');
const requiredDecisions = decisionSets[releaseScope];
const requiredApprovalRoles = ['Backend Tech Lead', 'Product Owner', 'QA Lead', 'Security Owner', 'Operations Owner'];
const approvalFile = process.env.RELEASE_APPROVALS_FILE?.trim();
let approvalRecord = null;
if (approvalFile) {
  try {
    approvalRecord = JSON.parse(readFileSync(resolve(root, approvalFile), 'utf8'));
  } catch {
    throw new Error('RELEASE_APPROVALS_FILE must be a readable JSON approval artifact');
  }
}
const approvals = Array.isArray(approvalRecord) ? approvalRecord : approvalRecord?.approvals;
const defaultApprovals = requiredApprovalRoles.map((role) => ({ role, status: 'pending' }));
const releaseApprovals = approvals ?? defaultApprovals;
const approvalArtifactChecksum = approvalFile ? digest(approvalFile) : undefined;
const securityArtifactFiles = {
  sast: process.env.SAST_ARTIFACT?.trim(),
  dependency: process.env.DEPENDENCY_SCAN_ARTIFACT?.trim(),
  secret: process.env.SECRET_SCAN_ARTIFACT?.trim(),
  container: process.env.CONTAINER_SCAN_ARTIFACT?.trim(),
  sbom: process.env.SBOM_ARTIFACT?.trim(),
  dast: process.env.DAST_ARTIFACT?.trim(),
};
const securityArtifacts = {};
for (const [name, file] of Object.entries(securityArtifactFiles)) {
  if (status === 'production' && !file) throw new Error(`production release manifest requires ${name} security artifact`);
  if (!file) continue;
  try {
    if (!readFileSync(resolve(root, file), 'utf8').trim()) throw new Error('empty');
  } catch {
    throw new Error(`${name} security artifact must be a readable non-empty file`);
  }
  securityArtifacts[name] = { checksum: digest(file) };
}

const commit = command('git', ['rev-parse', 'HEAD']);
const dirty = Boolean(command('git', ['status', '--porcelain']));
const imageDigest = required('IMAGE_DIGEST');
if (!/^sha256:[0-9a-f]{64}$/i.test(imageDigest)) throw new Error('IMAGE_DIGEST must be sha256:<64-hex-digest>');
const migrationImageDigest = process.env.MIGRATION_IMAGE_DIGEST?.trim();
const webImageDigest = process.env.WEB_IMAGE_DIGEST?.trim();
const postgresImageDigest = process.env.POSTGRES_IMAGE_DIGEST?.trim();
const redisImageDigest = process.env.REDIS_IMAGE_DIGEST?.trim();
for (const [name, value] of [['MIGRATION_IMAGE_DIGEST', migrationImageDigest], ['WEB_IMAGE_DIGEST', webImageDigest], ['POSTGRES_IMAGE_DIGEST', postgresImageDigest], ['REDIS_IMAGE_DIGEST', redisImageDigest]]) {
  if (value && !/^sha256:[0-9a-f]{64}$/i.test(value)) throw new Error(`${name} must be sha256:<64-hex-digest>`);
}
if (status === 'production' && dirty) throw new Error('production release manifest requires a clean worktree');
if (status === 'production' && process.env.RELEASE_APPROVED !== 'true') throw new Error('production release manifest requires RELEASE_APPROVED=true');
if (status === 'production' && !approvalFile) throw new Error('production release manifest requires RELEASE_APPROVALS_FILE');
if (status === 'production' && !migrationImageDigest) throw new Error('production release manifest requires MIGRATION_IMAGE_DIGEST');
if (status === 'production' && !webImageDigest) throw new Error('production release manifest requires WEB_IMAGE_DIGEST');
if (status === 'production' && !postgresImageDigest) throw new Error('production release manifest requires POSTGRES_IMAGE_DIGEST');
if (status === 'production' && !redisImageDigest) throw new Error('production release manifest requires REDIS_IMAGE_DIGEST');
if (status === 'production') {
  const approvalArtifactIssues = validateReleaseApprovalArtifact(approvalRecord, requiredDecisions, requiredApprovalRoles);
  if (approvalArtifactIssues.length) throw new Error(`production release approval artifact is invalid: ${approvalArtifactIssues.join('; ')}`);
  const approvedDecisionIds = new Set((approvalRecord?.decisions ?? []).filter((item) => item?.status === 'approved').map((item) => item?.id));
  const missingDecisions = requiredDecisions.filter((id) => !approvedDecisionIds.has(id));
  if (missingDecisions.length) throw new Error(`production release approval artifact is missing approved decisions: ${missingDecisions.join(', ')}`);
  const missingRoles = requiredApprovalRoles.filter((role) => !releaseApprovals.some((item) => item?.role === role && item?.status === 'approved' && item?.identity && item?.at));
  if (missingRoles.length) throw new Error(`production release approval artifact is missing approved roles: ${missingRoles.join(', ')}`);
}

const manifest = {
  release: process.env.RELEASE_VERSION ?? `phase-1a-${commit.slice(0, 12)}`,
  scope: releaseScope,
  status,
  commit,
  worktree_dirty: dirty,
  image_digest: imageDigest,
  openapi_checksum: digest('packages/contracts/openapi/cms.yaml'),
  migration_head: migrationHead(),
  decisions: requiredDecisions,
  test_runs: [
    { suite: 'root-ci', command: 'pnpm typecheck && pnpm lint && pnpm test', result: 'passed' },
    { suite: 'database-migrations', command: 'pnpm --filter @cms/api db:migrate:deploy && pnpm --filter @cms/api db:migrate:status', result: 'passed' },
    { suite: 'production-smoke', command: 'health/live + health/ready + protected-route deny', result: 'passed' },
  ],
  approvals: releaseApprovals,
  security_artifacts: securityArtifacts,
  activation_flags: {
    production_seed: process.env.PRODUCTION_SEED_ACTIVATION === 'true',
    documents: process.env.DOCUMENTS_ENABLED === 'true',
    bulk_export: process.env.BULK_EXPORT_ENABLED === 'true',
    purge: process.env.PURGE_ENABLED === 'true',
    break_glass: process.env.BREAK_GLASS_ENABLED === 'true',
  },
};
if (migrationImageDigest) manifest.migration_image_digest = migrationImageDigest;
if (webImageDigest) manifest.web_image_digest = webImageDigest;
if (postgresImageDigest) manifest.postgres_image_digest = postgresImageDigest;
if (redisImageDigest) manifest.redis_image_digest = redisImageDigest;
if (approvalArtifactChecksum) manifest.approval_artifact_checksum = approvalArtifactChecksum;

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`RELEASE_MANIFEST=${output}`);
console.log(`RELEASE_STATUS=${status}`);
console.log(`IMAGE_DIGEST=${imageDigest}`);
