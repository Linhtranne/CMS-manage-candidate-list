import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_APPROVAL_ROLES = ['Security Owner', 'Business Owner'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLICY_BOUNDS = {
  rate_per_minute: [1, 100000],
  burst: [1, 10000],
  max_concurrency: [1, 100],
  max_attempts: [1, 8],
  retry_window_seconds: [60, 86400],
};

function validBoundedInteger(value, [min, max]) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validEndpoint(value, scope) {
  try {
    const parsed = new URL(value);
    return (scope === 'development' || scope === 'test' || parsed.protocol === 'https:')
      && parsed.username === '' && parsed.password === '';
  } catch {
    return false;
  }
}

function validPolicy(policy) {
  return Boolean(policy && typeof policy === 'object'
    && Object.entries(POLICY_BOUNDS).every(([key, bounds]) => validBoundedInteger(policy[key], bounds)));
}

export function validateApproval(approval, { provider, scope }) {
  const scopes = Array.isArray(approval?.scope) ? approval.scope : [approval?.scope];
  const approvals = Array.isArray(approval?.approvals) ? approval.approvals : [];
  const canaryRecipients = Array.isArray(approval?.canary_recipients) ? approval.canary_recipients : [];
  return approval?.id === 'DEC-003'
    && approval?.status === 'approved'
    && typeof approval?.version === 'string' && approval.version.trim() !== ''
    && typeof approval?.provider === 'string' && approval.provider === provider
    && typeof approval?.artifact_checksum === 'string'
    && /^sha256:[0-9a-f]{64}$/i.test(approval.artifact_checksum)
    && (scopes.includes('staging-and-production') || scopes.includes(scope))
    && REQUIRED_APPROVAL_ROLES.every((role) => approvals.some((item) => item?.role === role && item?.identity && item?.at))
    && validEndpoint(approval?.sandbox_endpoint, scope)
    && canaryRecipients.length > 0
    && canaryRecipients.every((address) => typeof address === 'string' && EMAIL_PATTERN.test(address.trim()))
    && validPolicy(approval?.operational_policy);
}

export function validateSmokeUrl(approvedEndpoint, smokeUrl, scope) {
  try {
    const approved = new URL(approvedEndpoint);
    const requested = new URL(smokeUrl);
    return (scope === 'development' || scope === 'test' || requested.protocol === 'https:')
      && requested.username === '' && requested.password === ''
      && approved.origin === requested.origin;
  } catch {
    return false;
  }
}

export async function runProviderSmoke(env = process.env) {
  const provider = env.MAIL_PROVIDER?.trim() || 'DISABLED';
  const approvalFile = env.MAIL_PROVIDER_APPROVAL_RECORD_FILE?.trim();
  const scope = env.NODE_ENV?.trim() || 'development';

  if (provider === 'DISABLED') return { blocked: 'MAIL_PROVIDER=DISABLED; DEC-003 and a real provider sandbox are required' };
  if (provider === 'FAKE') {
    if (scope !== 'development' && scope !== 'test') return { blocked: 'MAIL_PROVIDER=FAKE is allowed only in development or test' };
    return { ok: true, provider, scope };
  }
  if (!approvalFile) return { blocked: 'MAIL_PROVIDER_APPROVAL_RECORD_FILE is required' };

  let approval;
  try { approval = JSON.parse(readFileSync(approvalFile, 'utf8')); } catch { return { blocked: 'DEC-003 approval record is unreadable' }; }
  if (!validateApproval(approval, { provider, scope })) return { blocked: 'DEC-003 approval record is not approved for this provider/environment' };

  const smokeUrl = env.MAIL_PROVIDER_SMOKE_URL?.trim();
  if (!smokeUrl) return { blocked: 'MAIL_PROVIDER_SMOKE_URL must point to the approved provider sandbox health contract' };
  if (!validateSmokeUrl(approval.sandbox_endpoint, smokeUrl, scope)) return { blocked: 'MAIL_PROVIDER_SMOKE_URL must use the approved sandbox origin' };

  let response;
  try {
    response = await fetch(smokeUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  } catch {
    return { failed: 'sandbox health is unavailable' };
  }
  if (!response.ok) return { failed: `sandbox health HTTP ${response.status}` };
  return { ok: true, provider, scope };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await runProviderSmoke();
  if (result.blocked) {
    console.error(`MAIL_PROVIDER_SMOKE_BLOCKED: ${result.blocked}`);
    process.exit(2);
  }
  if (result.failed) {
    console.error(`MAIL_PROVIDER_SMOKE_FAILED: ${result.failed}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ status: result.provider === 'FAKE' ? 'mail_provider_synthetic_smoke_ok' : 'mail_provider_sandbox_health_ok', provider: result.provider, scope: result.scope }));
}
