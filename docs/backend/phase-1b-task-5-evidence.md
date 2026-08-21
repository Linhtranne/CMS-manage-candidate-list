---
title: Phase 1B Task 5 provider and operations evidence
status: blocked_by_external_decision
technical_review: preparation_complete
external_approvals: DEC-003 required
version: 1.0.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 5 evidence

## Preparation delivered

- Added `ApprovedMailProviderAdapter`, which evaluates the DEC-003 approval gate on every provider operation and fails closed on revocation/missing approval.
- Added fake/disabled/approval-wrapper provider contract tests and masked mailbox health, pause, resume and sync admin commands with policy, CSRF, ID-only queue payloads and audit records.
- Added runtime DEC-003 validation for any non-disabled mail provider, provider smoke gate, production environment propagation and runbooks for auth expiry, sync recovery, uncertain send and the kill switch.
- Canonicalized provider identifiers across runtime config, OpenAPI and the mailbox domain to `MICROSOFT_GRAPH`, `GMAIL_API` and `SMTP_IMAP`; legacy `MICROSOFT_365`/`GOOGLE_WORKSPACE` values are no longer accepted.

## Verification

```text
vitest run test/providers/mail-provider.contract.spec.ts --pool=threads --maxWorkers=1  # 3 tests passed
vitest run test/providers/mailbox-admin.spec.ts --pool=threads --maxWorkers=1          # 3 tests passed
vitest run test/config/config.e2e-spec.ts --pool=threads --maxWorkers=1                 # 15 tests passed
pnpm --filter @cms/api typecheck                                                          # passed
pnpm --filter @cms/api lint                                                               # passed; MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                                                              # passed
node scripts/mail-provider-smoke.mjs                                                      # blocked safely: MAIL_PROVIDER=DISABLED
```

## Blocking gate

DEC-003 is still `blocked_by_external_decision`. No concrete Graph/Gmail/SMTP adapter, mailbox credential, DNS proof, sandbox health, canary recipient or real staging email is claimed. The safe runtime remains `MAIL_PROVIDER=DISABLED`; provider smoke must be rerun only after the approved DEC-003 record, provider sandbox URL and credential reference are supplied.
