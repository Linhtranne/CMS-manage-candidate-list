---
title: Phase 1B Task 3 inbound email evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 3 evidence

## Delivered

- Added signed `POST /api/v1/webhooks/mail/{provider}` handling with provider/mailbox/notification/message binding, replay claim storage and fail-closed rejection while the provider/queue is disabled.
- Hardened the public webhook boundary: only approved external providers are accepted (`FAKE` is synthetic-only), mailbox UUID/provider binding is checked before replay claim, and notification/message identifiers are validated with bounded DTO fields.
- Webhook queue payloads contain only schema, event, correlation, provider, mailbox, notification and provider-message identifiers. Message body, addresses and attachments are fetched by a worker and are not placed in queue payloads.
- Added `mail-ingest` fetch worker and sequential mailbox sync worker. A sync cursor advances only after every message in the fetched page commits successfully; a failed page item leaves the cursor unchanged for safe replay.
- Added transactional inbound ingest with provider-message dedupe, normalized sender/recipient addresses, immutable `RECEIVED` message persistence, provider thread/reply headers, append-only match decisions and conversation activity updates.
- Added conservative HTML sanitization before persistence/preview signing: formatting-only allowlist, no attributes/remote content, and active-content/comment stripping. The plain-text snapshot remains the canonical searchable body.
- Added deterministic matcher priority: verified signed reply token, `In-Reply-To`/`References`, provider thread, then unique sender. Ambiguous or uncorrelated messages are retained as `AMBIGUOUS`/`UNMATCHED` and are never guessed into a candidate.
- Added permission-gated `POST /api/v1/emails/{id}/match-resolution`; manual resolution requires a candidate and non-empty reason, appends an audit record and ID-only outbox event.
- Added `email_webhook_notifications` replay table and inbound message thread/header fields with least-privilege grants and no delete privilege for `cms_api`.

## Verification

```text
vitest run test/email --pool=threads --maxWorkers=1                    # 7 files, 40 tests passed
vitest run test/e2e/api.e2e-spec.ts --pool=threads --maxWorkers=1       # 1 file, 3 tests passed
vitest run (API) --pool=threads --maxWorkers=1                         # 48 files passed, 4 skipped; 172 passed, 15 skipped
pnpm --filter @cms/api typecheck                                        # passed
pnpm --filter @cms/api lint                                             # passed; MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                                            # passed
pnpm --filter @cms/contracts generate                                   # passed
pnpm --filter @cms/contracts typecheck                                  # passed
vitest run (contracts) --pool=threads --maxWorkers=1                    # 2 files, 7 tests passed
pnpm docs:validate                                                       # passed; BROKEN_LINKS=0, BACKEND_PLACEHOLDERS=0
```

The focused inbound suite covers token precedence, ambiguous sender handling, webhook signature verification, replay deduplication, ID-only queue payloads, committed message/match/cursor persistence and cursor safety when a page item fails. The first focused run was intentionally RED before the inbound application/worker files existed.

## Remaining gates

- `MAIL_PROVIDER=DISABLED` remains the safe default. No real provider webhook, poller, credential, external mailbox or staging delivery is claimed until DEC-003/DEC-005 and provider operations work are approved.
- Attachment quarantine, HTML/attachment sanitization and document handoff remain Phase 1B Task 4 scope.
- Backend Tech Lead, Security Owner and Operations Owner must review this evidence before Phase 1B integration.
