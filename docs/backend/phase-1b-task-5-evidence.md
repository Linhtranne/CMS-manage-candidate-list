---
title: Phase 1B Task 5 provider and operations evidence
status: blocked_by_external_decision
technical_review: preparation_complete
external_approvals: DEC-003 required
version: 1.0.0
updated_at: 2026-08-27
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 5 evidence

## Preparation delivered

- Added `ApprovedMailProviderAdapter`, which evaluates the DEC-003 approval gate on every provider operation and fails closed on revocation/missing approval.
- Added fake/disabled/approval-wrapper provider contract tests and masked mailbox health, pause, resume and sync admin commands with policy, CSRF, ID-only queue payloads and audit records.
- Added runtime DEC-003 validation for any non-disabled mail provider, including an approved sandbox endpoint, canary list and bounded rate/quota/concurrency/retry policy; provider smoke gate, production environment propagation and runbooks cover auth expiry, sync recovery, uncertain send and the kill switch.
- Added Redis-backed provider rate/concurrency enforcement with fixed-minute rate windows, burst windows, expiring concurrency leases and fail-closed Redis outage behavior; the limiter wraps every provider operation after canary validation.
- Canonicalized provider identifiers across runtime config, OpenAPI and the mailbox domain to `MICROSOFT_GRAPH`, `GMAIL_API` and `SMTP_IMAP`; legacy `MICROSOFT_365`/`GOOGLE_WORKSPACE` values are no longer accepted.
- Completed the admin health read model: masked address/provider, last successful sync/send, cursor age, configured queue/DLQ counts, auth expiry and sanitized provider error detail. Provider validation failures now return a redacted `failed` health state instead of leaking provider exceptions; successful outbound and reconciled sends persist `lastSendAt` transactionally.
- Added explicit runtime composition binding: `MAIL_PROVIDER=DISABLED` binds only the disabled adapter; approved `SMTP_IMAP` now binds the SES SMTP + Nodemailer delegate, while other non-disabled providers still fail startup with `MAIL_PROVIDER_ADAPTER_NOT_BOUND` until their concrete delegate is implemented.
- Added `SesSmtpMailProviderAdapter` with TLS SMTP send, idempotency header, redacted error mapping and explicit unsupported inbound operations. Local adapter/config tests cover health, send, authentication failure and secret non-disclosure.
- Added staging canary enforcement: `MAIL_CANARY_RECIPIENTS` is required for an enabled staging provider, normalized/deduplicated at config load, checked during preview/enqueue and enforced again at the provider boundary before any send call.
- Added provider-independent subscription lifecycle: mailbox subscription IDs/expiry are persisted, the scheduler selects due subscriptions under a PostgreSQL advisory lock, queue payloads contain only the mailbox ID, and renewal failures transition to `PAUSED_AUTH`/`DEGRADED` with ID-only outbox alerts.
- Hardened the provider smoke gate: DEC-003 records must include valid HTTPS sandbox endpoint, canary recipients and bounded operational policy; the requested smoke URL must share the approved sandbox origin and requests time out fail-closed.
- Added a synthetic-only `FAKE` provider binding for development/test, using the same approval wrapper, canary boundary and adapter contract; staging/production configuration rejects `FAKE`.

## Verification

```text
vitest run test/providers/mail-provider.contract.spec.ts --pool=threads --maxWorkers=1  # 3 tests passed
vitest run test/providers/mail-provider-binding.spec.ts --pool=threads --maxWorkers=1    # 7 tests passed
vitest run test/providers/mail-provider-ses.spec.ts --pool=threads --maxWorkers=1       # 4 tests passed
vitest run test/providers/mail-provider-rate-limiter.spec.ts --pool=threads --maxWorkers=1 # 3 tests passed
pnpm --filter @cms/api test:provider-smoke-gate                                      # 4 tests passed
vitest run test/providers/mailbox-admin.spec.ts --pool=threads --maxWorkers=1          # 4 tests passed
vitest run test/providers/subscription-renewal.spec.ts --pool=threads --maxWorkers=1     # 3 tests passed
vitest run test/resilience/queue-health.spec.ts --pool=threads --maxWorkers=1          # 3 tests passed
vitest run test/config/config.e2e-spec.ts --pool=threads --maxWorkers=1                 # 17 tests passed
vitest run --pool=threads --maxWorkers=1                                              # 72 files; 243 passed, 15 skipped
pnpm --filter @cms/api typecheck                                                          # passed
pnpm --filter @cms/api lint                                                               # passed; MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                                                              # passed
node scripts/mail-provider-smoke.mjs                                                      # blocked safely: MAIL_PROVIDER=DISABLED
docker compose ps                                                                          # api/postgres/redis healthy
prisma migrate status                                                                      # 13 migrations; database schema up to date
subscription lifecycle DB check                                                            # provider subscription columns/index present; cms_api UPDATE=true, DELETE=false
query-plan-smoke                                                                           # passed; candidate/application/interview indexes selected
```

## Blocking gate

DEC-003 is still `blocked_by_external_decision` for external activation. The concrete SES SMTP adapter exists, but no real mailbox credential, DNS proof, sandbox health or staging email is claimed. The safe runtime remains `MAIL_PROVIDER=DISABLED`/`FAKE` until the approved DEC-003 record, provider sandbox evidence and local secret injection are supplied.
