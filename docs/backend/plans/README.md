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
