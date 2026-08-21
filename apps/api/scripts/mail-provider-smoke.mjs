import { readFileSync } from 'node:fs';

const provider = process.env.MAIL_PROVIDER?.trim() || 'DISABLED';
const approvalFile = process.env.MAIL_PROVIDER_APPROVAL_RECORD_FILE?.trim();
const scope = process.env.NODE_ENV?.trim() || 'development';

if (provider === 'DISABLED') {
  console.error('MAIL_PROVIDER_SMOKE_BLOCKED: MAIL_PROVIDER=DISABLED; DEC-003 and a real provider sandbox are required');
  process.exit(2);
}
if (!approvalFile) {
  console.error('MAIL_PROVIDER_SMOKE_BLOCKED: MAIL_PROVIDER_APPROVAL_RECORD_FILE is required');
  process.exit(2);
}

let approval;
try { approval = JSON.parse(readFileSync(approvalFile, 'utf8')); } catch { console.error('MAIL_PROVIDER_SMOKE_BLOCKED: DEC-003 approval record is unreadable'); process.exit(2); }
const scopes = Array.isArray(approval?.scope) ? approval.scope : [approval?.scope];
const approvals = Array.isArray(approval?.approvals) ? approval.approvals : [];
const requiredRoles = ['Security Owner', 'Business Owner'];
const valid = approval?.id === 'DEC-003'
  && approval?.status === 'approved'
  && typeof approval?.version === 'string'
  && typeof approval?.provider === 'string'
  && approval.provider === provider
  && typeof approval?.artifact_checksum === 'string'
  && /^sha256:[0-9a-f]{64}$/i.test(approval.artifact_checksum)
  && (scopes.includes('staging-and-production') || scopes.includes(scope))
  && requiredRoles.every((role) => approvals.some((item) => item?.role === role && item?.identity && item?.at));
if (!valid) {
  console.error('MAIL_PROVIDER_SMOKE_BLOCKED: DEC-003 approval record is not approved for this provider/environment');
  process.exit(2);
}

const smokeUrl = process.env.MAIL_PROVIDER_SMOKE_URL?.trim();
if (!smokeUrl) {
  console.error('MAIL_PROVIDER_SMOKE_BLOCKED: MAIL_PROVIDER_SMOKE_URL must point to the provider sandbox health contract');
  process.exit(2);
}
const response = await fetch(smokeUrl, { headers: { accept: 'application/json' } });
if (!response.ok) {
  console.error(`MAIL_PROVIDER_SMOKE_FAILED: sandbox health HTTP ${response.status}`);
  process.exit(1);
}
console.log(JSON.stringify({ status: 'mail_provider_sandbox_health_ok', provider, scope }));
