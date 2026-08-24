---
title: Phase 1B checkpoint evidence
status: blocked_by_external_decision
technical_review: complete_for_disabled_fake_and_preparation_scope
external_approvals: DEC-003 and DEC-005 pending
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: critical
---

# Phase 1B checkpoint

## Current technical state

| Area | Evidence | Status |
|---|---|---|
| Email schema/domain/immutability | [Task 1 evidence](./phase-1b-task-1-evidence.md), migration/state tests | Complete for disabled/fake adapters |
| Preview/enqueue/outbound resilience | [Task 2 evidence](./phase-1b-task-2-evidence.md) | Complete for disabled/fake adapters |
| Retry/cancel commands | [Task 2 evidence](./phase-1b-task-2-evidence.md), outbound resilience suite | CAS + audit/outbox complete; real provider remains gated |
| Shared inbox conversation list/detail | [Task 2 evidence](./phase-1b-task-2-evidence.md), conversation query suite | Scoped, bounded read contract complete; unmatched requires manual-link permission |
| Inbound webhook/poller/matcher | [Task 3 evidence](./phase-1b-task-3-evidence.md) | Complete for disabled/fake adapters, including HTML sanitization |
| Attachment quarantine/handoff | [Task 4 evidence](./phase-1b-task-4-evidence.md) | Complete as fail-closed injectable pipeline |
| Provider/operations preparation | [Task 5 evidence](./phase-1b-task-5-evidence.md) | Synthetic FAKE binding complete for development/test; real provider binding remains gated |
| Regression/contracts/docs | API 48 files/172 tests passed (4 files/15 tests skipped); web 53 files/132 tests passed with the CI-safe Vitest pool; contracts 7 tests passed; docs validator clean | Green locally |
| Disposable runtime | 13 migrations applied; API `/health/live` 200 in rebuilt container; query-plan smoke green; Redis `PONG` with `maxmemory-policy=noeviction`; `cms_api` non-superuser with Email Hub DELETE denied | Green for local DB/Redis/API |

The canonical external provider enum is `MICROSOFT_GRAPH | GMAIL_API | SMTP_IMAP`; `FAKE` is a synthetic-only runtime mode for development/test and is rejected in staging/production. Mailbox health now exposes the operational fields required by the email specification while keeping provider failures and addresses redacted. Workspace `typecheck` and `lint` pass; web Vitest passes through the canonical CI-safe command `pnpm --filter @cms/web test:ci` (53 files, 132 tests).

## Blocking gates

- DEC-003 must name the provider, mailbox/domain owner, OAuth scope, DNS/auth evidence, rate/retry/canary policy and sandbox endpoint before any real provider adapter or staging email is enabled.
- DEC-005 must approve purpose/notice, retention/legal hold, raw MIME/attachment handling, cross-border scope and purge controls before real candidate data or attachments are used.
- Object storage and antivirus runtime smoke remains intentionally unevidenced: the default bindings are disabled until the approved storage/scanner deployment and retention policy exist.
- Human review remains required from Backend Tech Lead, Security Owner, Operations Owner and the DEC-003/DEC-005 approvers.

Until those gates exist, `MAIL_PROVIDER=DISABLED`, external storage/scanner bindings remain disabled, and no staging/production email or attachment delivery is claimed.
