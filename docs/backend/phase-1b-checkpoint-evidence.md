---
title: Phase 1B checkpoint evidence
status: blocked_by_external_decision
technical_review: complete_for_disabled_fake_and_preparation_scope
external_approvals: DEC-003 and DEC-005 pending
version: 1.0.0
updated_at: 2026-08-21
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
| Provider/operations preparation | [Task 5 evidence](./phase-1b-task-5-evidence.md) | Preparation complete; provider binding blocked |
| Regression/contracts/docs | API 44 files/148 tests passed (4 files/15 tests skipped); contracts 7 tests passed; docs validator clean | Green locally |

The canonical provider enum is `MICROSOFT_GRAPH | GMAIL_API | SMTP_IMAP` across runtime config, OpenAPI, generated types and the web mailbox consumer. Sequential workspace `typecheck` and `lint` pass; web Vitest/Next worker execution remains unevidenced because this Windows session returns `spawn EPERM` when those tools start child workers.

## Blocking gates

- DEC-003 must name the provider, mailbox/domain owner, OAuth scope, DNS/auth evidence, rate/retry/canary policy and sandbox endpoint before any real provider adapter or staging email is enabled.
- DEC-005 must approve purpose/notice, retention/legal hold, raw MIME/attachment handling, cross-border scope and purge controls before real candidate data or attachments are used.
- Docker/DB/Redis/object-storage runtime smoke is not evidenced in this environment because the Docker engine pipe currently returns permission denied.
- Human review remains required from Backend Tech Lead, Security Owner, Operations Owner and the DEC-003/DEC-005 approvers.

Until those gates exist, `MAIL_PROVIDER=DISABLED`, external storage/scanner bindings remain disabled, and no staging/production email or attachment delivery is claimed.
