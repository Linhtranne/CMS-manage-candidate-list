---
title: Phase 1B Task 2 outbound email evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 2 evidence

## Delivered

- Added signed, 15-minute email previews bound to mailbox, recipients, body/template checksum and domain context; verification rejects expiry, tampering and request mismatch.
- Added fail-closed preview checks for `DO_NOT_CONTACT`, temporarily unreachable candidates, unsafe attachments, ambiguous/inapplicable templates and auto-reply loops.
- Added `POST /api/v1/emails/previews` and `POST /api/v1/emails` with session, CSRF and `email.send` policy enforcement. Enqueue requires an idempotency key and rechecks candidate contactability inside the transaction.
- Added a transaction that creates `QUEUED` immutable messages, recipients, conversation and ID-only `email.send.requested` outbox event plus audit evidence. Outbox/queue payloads do not contain body, recipient address or attachment data.
- Added outbound send processor with DB CAS claim, mailbox kill-switch check, stable provider idempotency key, transactional delivery event and failure classification. Uncertain provider outcomes become `RECONCILING`; they are never blindly retried.
- Retryable failures now use bounded exponential backoff with jitter and honor numeric/date `Retry-After` values from the provider error boundary.
- Added reconciliation processor that searches the provider by the stable client reference before permitting `RETRY_WAIT` or marking `SENT`.
- Added audited `POST /api/v1/email-messages/{id}/cancellations` and `POST /api/v1/email-messages/{id}/retry-attempts` commands. Cancellation is CAS-limited to `QUEUED|RETRY_WAIT`; manual retry is limited to `FAILED` and explicitly rejects `RECONCILING` uncertain sends.
- Added `GET /api/v1/mailbox/conversations` and `GET /api/v1/mailbox/conversations/{id}` with allowlisted views, stable bounded cursor pagination, candidate/team policy filters and explicit manual-link access for unmatched messages. Detail serialization exposes only immutable message fields and safe attachment metadata; provider IDs, object keys, BCC and signed URLs never enter the DTO.
- Added versioned `POST /api/v1/mailbox/conversations/{id}/send` and manual-link commands. Replies derive the mailbox From address server-side, require a matched candidate and SAFE attachments, reject stale conversation versions, and emit auditable ID-only outbox events; link resolution uses a candidate/team policy check and CAS.
- Wired the contract-aligned legacy email routes (`/email-previews`, `/email-drafts`, `/conversations/{id}/messages`, `/inbox/messages/{id}/match-decisions`) to the same policy-guarded services. Drafts are server-owned, optionally idempotent, create no outbox event; legacy manual match now validates candidate scope and uses conversation-version CAS.
- Wired the outbound handler into the fail-closed worker runtime; the real adapter remains `MAIL_PROVIDER=DISABLED` by default.

## Verification

```text
pnpm --filter @cms/api typecheck                                  # passed
pnpm --filter @cms/api lint                                       # passed; MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                                      # passed
vitest run test/email --pool=threads --maxWorkers=1               # 7 files, 40 tests passed
vitest run test/email/outbound-resilience.spec.ts --pool=threads --maxWorkers=1 # 18 tests passed
vitest run (API) --pool=threads --maxWorkers=1                     # 48 files passed, 4 skipped; 172 passed, 15 skipped (187 total)
pnpm --filter @cms/contracts generate                             # passed
pnpm --filter @cms/contracts typecheck                            # passed
pnpm --filter @cms/contracts test --pool=threads --maxWorkers=1   # 7 tests passed
```

The focused outbound suite covers expired/tampered previews, DNC and unsafe attachment rejection, auto-reply loop blocking, signed preview binding, DB claim loss, kill switch, bounded policy retry, uncertain send, provider reconciliation and ID-only outbox payloads. The first focused run was intentionally RED before the new application/worker files existed.

## Remaining gates

- `MAIL_PROVIDER=DISABLED` remains the only safe default. DEC-003 provider selection, DEC-005 privacy/retention scope and staging canary approval are still external gates.
- Provider sandbox contract, SPF/DKIM/DMARC, real webhook/poller and credential-rotation evidence are Task 3/5 scope; no real external email is claimed here.
- Backend Tech Lead, Security Owner and Operations Owner must review this evidence before Phase 1B integration.
