---
title: Backend Requirements Traceability
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: QA Lead
reviewers:
  - Product Owner
  - Backend Tech Lead
approvers:
  - QA Lead
  - Product Owner
risk: high
---

# 13. Traceability

## 1. Trace chain

Mỗi PR phải truy từ `RQ/AC -> backend spec section -> implementation plan task -> test ID -> release evidence`. PR không có chain này chưa đủ Definition of Ready.

Nguồn yêu cầu gốc là [truy vết yêu cầu](../15-truy-vet-yeu-cau.md), [kiểm thử nghiệm thu](../09-kiem-thu-nghiem-thu.md) và [ma trận email](../12-ma-tran-email-thong-bao.md).

## 2. Requirement-to-spec matrix

| Requirement | Backend ownership | Production spec | Plan |
|---|---|---|---|
| RQ-01–RQ-02 internal-only, no portal | identity/access | [03](./03-api-iam-and-permissions.md), [09](./09-security-privacy-threat-model.md) | [Phase 0](./plans/00-phase-0-foundation.md) |
| RQ-03–RQ-06 candidate/interview/passed views | candidates, applications/interviews | [05](./05-recruitment-domain.md) | [Phase 1A](./plans/01-phase-1a-core-recruitment.md) |
| RQ-07–RQ-08 journey, no flight aggregate | supply-journeys | [06](./06-supply-journey-and-documents.md) | [Phase 2](./plans/03-phase-2-supply-journey.md) |
| RQ-09–RQ-11 shared two-way email | email-hub/workers | [07](./07-email-hub-workers-and-storage.md) | [Phase 1B](./plans/02-phase-1b-email-hub.md) |
| RQ-12–RQ-14 scale/Ubuntu/stack | platform/operations | [02](./02-architecture-and-runtime.md), [10](./10-observability-operations-dr.md) | [Phase 0](./plans/00-phase-0-foundation.md), [Phase 3–4](./plans/04-phase-3-4-reporting-go-live.md) |
| RQ-16 multi-industry | catalog/candidates/orders | [04](./04-data-prisma-and-migrations.md), [05](./05-recruitment-domain.md) | [Phase 1A](./plans/01-phase-1a-core-recruitment.md) |
| RQ-17 privacy/Japan sharing | security/audit/export | [08](./08-tasks-reports-admin-audit.md), [09](./09-security-privacy-threat-model.md) | [Phase 3–4](./plans/04-phase-3-4-reporting-go-live.md) |
| RQ-18–RQ-19 UI/UX implementation | frontend; backend contract support | [01](./01-contract-alignment.md), [03](./03-api-iam-and-permissions.md) | all phases contract checks |

RQ-15 là documentation deliverable; được bao phủ bởi gói này, doc validator và [Definition of Done](./14-definition-of-done.md).

## 3. Acceptance-to-test ownership

| Acceptance | Owning spec | Required suite/tag |
|---|---|---|
| AC-01–AC-03 | [05 Recruitment](./05-recruitment-domain.md) | `e2e/recruitment AC-01..03` |
| AC-04 | [06 Journey](./06-supply-journey-and-documents.md) | `e2e/journey AC-04` |
| AC-05–AC-09 | [07 Email](./07-email-hub-workers-and-storage.md) | `e2e/email AC-05..09` |
| AC-10–AC-11 | [03 IAM](./03-api-iam-and-permissions.md), [08 Admin/Audit](./08-tasks-reports-admin-audit.md) | `e2e/permissions AC-10..11` |
| AC-12 | [10 Operations/DR](./10-observability-operations-dr.md) | `recovery AC-12` |
| AC-13–AC-16 | [07 Email](./07-email-hub-workers-and-storage.md) | `resilience/email AC-13..16` |
| AC-17 | [04 Data](./04-data-prisma-and-migrations.md), [08 Export](./08-tasks-reports-admin-audit.md) | `e2e/import-export AC-17` |
| AC-18 | [04 Data](./04-data-prisma-and-migrations.md), [05 Recruitment](./05-recruitment-domain.md) | `concurrency AC-18` |
| AC-19 | [07 Email](./07-email-hub-workers-and-storage.md) | `resilience/email AC-19` |
| AC-20 | [06 Journey](./06-supply-journey-and-documents.md) | `e2e/journey AC-20` |
| AC-21 | [05 Recruitment](./05-recruitment-domain.md), [08 Tasks](./08-tasks-reports-admin-audit.md) | `e2e/ownership AC-21` |
| AC-22–AC-24 | [05 Recruitment](./05-recruitment-domain.md) | `e2e/catalog-recruitment AC-22..24` |
| AC-25 | [06 Journey](./06-supply-journey-and-documents.md) | `e2e/journey-template AC-25` |
| AC-26 | [07 Email](./07-email-hub-workers-and-storage.md), [09 Security](./09-security-privacy-threat-model.md) | `staging/mail-auth AC-26` |
| AC-27 | [09 Security](./09-security-privacy-threat-model.md) | `e2e/privacy AC-27` |
| AC-28–AC-30 | frontend with backend contract support | frontend E2E/accessibility tags |
| AC-31 | [03 IAM](./03-api-iam-and-permissions.md), [04 Data](./04-data-prisma-and-migrations.md) | `e2e/concurrency AC-31` |
| AC-32 | [07 Workers](./07-email-hub-workers-and-storage.md), [08 Reports](./08-tasks-reports-admin-audit.md) | `e2e/jobs AC-32` |
| EM-AC-01–04 | [07 Email](./07-email-hub-workers-and-storage.md) | `e2e/email EM-AC-01..04` |

## 4. Cross-cutting controls

| Control | Spec | Evidence |
|---|---|---|
| OpenAPI canonical/envelope/errors/security | [01](./01-contract-alignment.md) | lint + generated diff + provider/consumer tests |
| OIDC/action/scope/sensitivity | [03](./03-api-iam-and-permissions.md) | permission matrix suite |
| constraints/migration/retention | [04](./04-data-prisma-and-migrations.md) | DB introspection + migration rehearsal |
| threat/privacy/secrets | [09](./09-security-privacy-threat-model.md) | security suite + approvals/scans |
| SLO/monitor/backup/restore | [10](./10-observability-operations-dr.md) | dashboards/alerts/restore report |
| test/release/waiver | [11](./11-testing-and-release-gates.md) | release manifest |
| business/external decisions | [12](./12-decision-register.md) | approved decision records |

## 5. Phase exit traceability

| Phase | Exit condition | Evidence owner |
|---|---|---|
| 0 Foundation | canonical contract, runtime, DB, IAM/permission, CI/observability green | Backend Tech Lead |
| 1A Recruitment | catalog/client/order/candidate/application/interview AC green | Product Owner + QA Lead |
| 1B Email | provider approved, send/ingest/reply/attachment/resilience green | Security + IT/Mail Owner |
| 2 Journey | approved templates, milestone/document workflow AC green | Product + Japan Operations |
| 3–4 Go-live | reports/admin/audit, security/perf/DR/UAT/release gates green | release signatories |

## 6. PR trace format

PR description phải chứa:

```text
Requirement: RQ-xx / AC-xx
Spec: docs/backend/<file>#<section>
Plan task: docs/backend/plans/<file> Task N
Tests: <test paths and commands>
Decision dependencies: DEC-xxx status/version
Migration/security/operations impact: <explicit none or evidence links>
```

Giá trị mô tả PR phải được điền cụ thể; không merge placeholder hoặc ghi “not applicable” nếu thay đổi thực sự chạm data/auth/async/provider.
