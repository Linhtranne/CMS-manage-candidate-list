---
title: Backend Implementation Plans
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
risk: high
---

# Backend implementation plans

## Execution order

| Order | Plan | Dependency | Exit gate |
|---:|---|---|---|
| 0 | [Phase 0 — Foundation](./00-phase-0-foundation.md) | DEC-001; DEC-002 trước staging SSO | contract/runtime/DB/IAM/CI green |
| 1 | [Phase 1A — Core Recruitment](./01-phase-1a-core-recruitment.md) | Phase 0 | AC recruitment/import/concurrency green |
| 2 | [Phase 1B — Email Hub](./02-phase-1b-email-hub.md) | Phase 0 + candidate context; DEC-003/005 trước real mail | email/resilience/security green |
| 3 | [Phase 2 — Supply Journey](./03-phase-2-supply-journey.md) | Phase 1A; document foundation; DEC-004/005 | journey/document AC green |
| 4 | [Phase 3–4 — Reporting and Go-live](./04-phase-3-4-reporting-go-live.md) | Phases 0–2; DEC-005–007 | UAT/security/performance/DR/release green |

Phase 1A và phần adapter-fake của 1B có thể phát triển song song sau Phase 0, nhưng email staging thật không được chạy trước approvals. Mỗi plan thực thi task-by-task, mỗi task giữ test-first evidence và commit nhỏ; không gom migration, auth và business behavior không liên quan vào một commit.

## Current handoff state

- Phase 0 technical implementation and regression evidence: **complete**.
- DEC-001/DEC-002 human approval: **pending**; runtime remains deny-by-default/OIDC-disabled until external records exist.
- Phase 1A Task 1 technical implementation and regression evidence: **complete**; see [Task 1 evidence](../phase-1a-task-1-evidence.md). Production catalog/template activation remains blocked by DEC-004.
- Phase 1A Task 2 technical implementation and runtime regression evidence: **complete**; see [Task 2 evidence](../phase-1a-task-2-evidence.md).
- Phase 1A Task 3 technical implementation and regression evidence: **complete**; see [Task 3 evidence](../phase-1a-task-3-evidence.md). Archive approval, fuzzy threshold and reviewer-owned AC-28/AC-31 sign-off remain fail-closed gates.
- Phase 1A Task 4 technical implementation and regression evidence: **complete**; see [Task 4 evidence](../phase-1a-task-4-evidence.md).
- Phase 1A Task 5 technical implementation and regression evidence: **complete**; see [Task 5 evidence](../phase-1a-task-5-evidence.md).
- Phase 1A Task 6 technical implementation and regression evidence: **complete**; see [Task 6 evidence](../phase-1a-task-6-evidence.md).
- Phase 1A technical checkpoint: **ready for human approval**; see [checkpoint evidence](../phase-1a-checkpoint-evidence.md). External production promotion is not claimed until named deployment, secrets, approvals and UAT evidence exist.
- Phase 1B Task 1 technical implementation: **complete**; email schema/domain foundation, immutable message trigger, disabled/fake adapters and PostgreSQL migration evidence are in [Task 1 evidence](../phase-1b-task-1-evidence.md). Real provider remains disabled pending DEC-003/DEC-005.
- Phase 1B Task 2 technical implementation: **complete**; signed preview, idempotent enqueue/outbox, CAS outbound worker and reconciliation evidence are in [Task 2 evidence](../phase-1b-task-2-evidence.md). Real provider remains disabled pending DEC-003/DEC-005.
- Phase 1B Task 3 technical implementation: **complete**; verified webhook replay protection, ID-only fetch queue, transactional inbound ingest/cursor, deterministic matcher and manual match resolution evidence are in [Task 3 evidence](../phase-1b-task-3-evidence.md). Real provider remains disabled pending DEC-003/DEC-005.
- Phase 1B Task 4 technical implementation: **complete**; streaming attachment quarantine, checksum/MIME/scan state machine, ID-only document handoff and authorized signed-download evidence are in [Task 4 evidence](../phase-1b-task-4-evidence.md). Real object storage/scanner remain disabled until their production approvals exist.
- Phase 1B Task 5 technical preparation: **complete; provider binding blocked by DEC-003**; approval-gated provider wrapper, mailbox operations, subscription renewal lifecycle, runbooks and smoke gate are in [Task 5 evidence](../phase-1b-task-5-evidence.md). No concrete provider or real staging mail is claimed.
- Phase 1B checkpoint: **blocked by DEC-003/DEC-005**; see [checkpoint evidence](../phase-1b-checkpoint-evidence.md). Local regressions and disposable DB/Redis/API container smoke are green; no real provider, object-storage/scanner binding or production promotion is claimed.
- Phase 2 technical implementation: **complete; activation/UAT remains gated**; journey start, milestone transitions/attempts, document quarantine/link/access audit and lifecycle completion are in [Phase 2–4 evidence](../phase-2-4-implementation-evidence.md). DEC-004/005, real storage/scanner and named UAT remain closed.
- Phase 3–4 technical foundation: **implemented; production checkpoint remains blocked**; tasks/rules, canonical report projections/query guards, fail-closed exports, scoped audit and retention/legal-hold controls are in [Phase 2–4 evidence](../phase-2-4-implementation-evidence.md). Security/performance/DR/restore/provider/release evidence is still external work.

## Global execution rules

- Đọc [governance](../00-governance-and-source-of-truth.md), spec owning module và [DoD](../14-definition-of-done.md) trước khi code.
- Không triển khai từ frontend mock nếu khác canonical spec/OpenAPI.
- Mỗi schema change chạy migration test; mỗi endpoint có contract + permission test.
- Feature bị external decision chặn phải ship ở trạng thái disabled/fail-closed.
- Không merge placeholder, skipped test, secret, production data hoặc generated contract drift.
- Sau mỗi task: chạy command ghi trong plan, review diff, cập nhật traceability nếu behavior đổi, rồi commit theo message đề xuất.

## File ownership during execution

- `packages/contracts/openapi/cms.yaml`: canonical wire contract; Backend Tech Lead review.
- `apps/api/prisma/**`: database contract; Database Reviewer review.
- `apps/api/src/modules/identity-access/**`, security config: Security Owner review.
- mail/provider/storage: Security + Operations review.
- deployment/runbooks/recovery: Operations review.
- seed/template/report definition: Product/Business approval, không tự activate từ developer seed.
