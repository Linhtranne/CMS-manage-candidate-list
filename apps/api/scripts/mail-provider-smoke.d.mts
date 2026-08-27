export function validateApproval(approval: unknown, input: { provider: string; scope: string }): boolean;
export function validateSmokeUrl(approvedEndpoint: string, smokeUrl: string, scope: string): boolean;
export function runProviderSmoke(env?: Record<string, string | undefined>): Promise<
  | { blocked: string }
  | { failed: string }
  | { ok: true; provider: string; scope: string }
>;
