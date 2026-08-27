import { readFileSync } from 'node:fs';

const issuer = process.env.OIDC_ISSUER?.trim();
const audience = process.env.OIDC_AUDIENCE?.trim();
const approvalFile = process.env.OIDC_APPROVAL_RECORD_FILE?.trim();

if (!issuer || !audience || !approvalFile) {
  console.error('PROVIDER_SMOKE_BLOCKED: OIDC_ISSUER, OIDC_AUDIENCE and OIDC_APPROVAL_RECORD_FILE are required after DEC-002 approval');
  process.exit(2);
}

let approval;
try {
  approval = JSON.parse(readFileSync(approvalFile, 'utf8'));
} catch {
  console.error('PROVIDER_SMOKE_BLOCKED: OIDC approval record is unreadable');
  process.exit(2);
}

const scopes = Array.isArray(approval?.scope) ? approval.scope : [approval?.scope];
const requiredRoles = ['Security Owner', 'IT Identity Owner'];
const approvals = Array.isArray(approval?.approvals) ? approval.approvals : [];
const hasRequiredApprovals = requiredRoles.every((role) => approvals.some((item) => item?.role === role));
if (approval?.id !== 'DEC-002' || approval?.status !== 'approved' || !approval?.version
  || typeof approval?.artifact_checksum !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(approval.artifact_checksum)
  || !scopes.includes('staging-and-production') && !scopes.includes(process.env.NODE_ENV)
  || !hasRequiredApprovals) {
  console.error('PROVIDER_SMOKE_BLOCKED: DEC-002 approval record is not approved for this environment');
  process.exit(2);
}

const discoveryUrl = new URL('.well-known/openid-configuration', issuer.endsWith('/') ? issuer : `${issuer}/`);
const response = await fetch(discoveryUrl);
if (!response.ok) {
  console.error(`PROVIDER_SMOKE_FAILED: discovery HTTP ${response.status}`);
  process.exit(1);
}
const discovery = await response.json();
if (discovery.issuer !== issuer) {
  console.error('PROVIDER_SMOKE_FAILED: discovery issuer does not match approved OIDC_ISSUER');
  process.exit(1);
}
for (const key of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
  if (typeof discovery[key] !== 'string' || !discovery[key]) {
    console.error(`PROVIDER_SMOKE_FAILED: discovery missing ${key}`);
    process.exit(1);
  }
}
console.log(JSON.stringify({ status: 'discovery_ok', issuer, audience, endpoints: ['authorization_endpoint', 'token_endpoint', 'jwks_uri'] }));
