---
title: Phase 1B Task 1 email domain foundation evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 1 evidence

## Delivered

- Added `mailboxes`, `email_conversations`, `email_messages`, `email_recipients`, `email_attachments` and append-only `email_match_decisions` tables in migration `20260820020100_email_hub`.
- Added provider/idempotency dedupe indexes, state/check constraints, application-role `SELECT/INSERT/UPDATE` grants and `DELETE` revocation.
- Added a PostgreSQL trigger that rejects body, subject, sender or sanitized HTML mutation after an email reaches `SENT` or `RECEIVED`.
- Added explicit email state transition and address/recipient normalization rules.
- Added `DisabledMailProviderAdapter` (health `not_configured`, all I/O fail with `MAIL_PROVIDER_DISABLED`) and deterministic `FakeMailProviderAdapter` for CI.
- Registered the email-hub foundation in the Nest application while keeping the real provider adapter disabled by default.

## Verification

```text
pnpm --filter @cms/api exec vitest run test/email        # 2 files, 6 tests passed
pnpm --filter @cms/api typecheck                         # passed
pnpm --filter @cms/api lint                             # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                            # passed
pnpm --filter @cms/contracts generate                    # passed
pnpm --filter @cms/contracts test                       # 7 tests passed
PostgreSQL disposable migration                         # 12 migrations applied; status up to date
PostgreSQL trigger/privilege smoke                       # EMAIL_HUB_DB_INVARIANTS_OK; cms_api DELETE=false
```

The first email-domain test run intentionally failed RED before the adapters/rules existed, then passed after the implementation. Provider integration, send/ingest workers and real mailbox operations are not claimed in Task 1.

## Remaining gates

- `MAIL_PROVIDER=DISABLED` remains the only safe default until DEC-003 selects and approves a shared mailbox provider.
- DEC-005 privacy/retention/cross-border scope and canary recipient approval remain required before real mail or attachments.
- Task 2 must add preview/enqueue/outbound worker behavior; Task 3 must add inbound reconciliation/matching before Phase 1B checkpoint.
