# Phase 1A Core Recruitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triển khai production backend cho catalog, client/order, candidate, import/dedupe/merge, application và multi-round interview.

**Architecture:** Bốn domain module giữ aggregate/repository riêng. Cross-module command dùng application port trong cùng process; event side effects qua outbox. PostgreSQL constraint là tuyến phòng thủ cuối cho uniqueness/concurrency.

**Tech Stack:** Phase 0 stack + Prisma transactions, streaming CSV/XLSX parser, BullMQ import jobs, generated OpenAPI types.

**Spec:** [Recruitment domain](../05-recruitment-domain.md), [Data/migrations](../04-data-prisma-and-migrations.md), [IAM](../03-api-iam-and-permissions.md).

**Global Constraints:** Không activate catalog/template production nếu DEC-004 chưa approved. Exact duplicate checks bật; fuzzy threshold không tự quyết trước approval. Một Candidate là một người, trạng thái Application/Interview tách biệt.

### Task 1: Implement versioned catalog and interview templates

**Files:**

- Create: `apps/api/src/modules/catalog/{domain,application,infrastructure,http}/**`
- Create: `apps/api/prisma/migrations/20260820010100_catalog/migration.sql`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/catalog/catalog.integration-spec.ts`, `apps/api/test/catalog/catalog.e2e-spec.ts`

**Interfaces:** `CatalogService.createDraft/activate/retire`; `GET/POST /admin/catalogs`, `POST /admin/catalogs/{id}/activate`, and `POST /admin/catalogs/{id}/retire`. All activation/retirement requires the server-side approved DEC-004 artifact gate.

- [x] Write state-table tests for `DRAFT -> ACTIVE -> RETIRED`, active/reference immutability, ambiguous version and question template snapshot inputs.
- [x] Run catalog tests and confirm missing repository/constraints fail.
- [x] Implement identity/version tables, JSON Schema subset validator, application service, policy actions and canonical envelopes/errors.
- [x] Add technical seed only for permission/reason codes; business catalog activation reads approved artifact checksum.
- [x] Run migration/unit/integration/contract/E2E tests and generated client check.
- [ ] Commit: `feat(catalog): add immutable versioned catalogs`.

### Task 2: Implement Client, Contact and JobOrder

**Files:**

- Create: `apps/api/src/modules/clients-orders/{domain,application,infrastructure,http}/**`
- Create: `apps/api/prisma/migrations/20260820010200_clients_orders/migration.sql`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/clients-orders/job-order.integration-spec.ts`, `apps/api/test/clients-orders/job-order.e2e-spec.ts`

**Interfaces:** `ClientService`, `JobOrderService.create/updateRequirement/transition`; JobOrder status table from spec 05.

- [x] Write failing tests for invalid quantity/deadline/catalog, transition matrix, contact masking, requirement version snapshot and version conflict.
- [x] Run focused tests; verify missing tables/routes produce expected failures.
- [x] Implement aggregate/repositories/DTOs/endpoints with scope SQL, optimistic concurrency, history/audit/outbox.
- [x] Add partial/stable list indexes and cursor `(sortValue,id)`; contract examples/errors for every operation.
- [x] Run AC-oriented module E2E plus query plan fixture.
- [ ] Commit: `feat(orders): add clients and versioned job orders`.

### Task 3: Implement Candidate profiles and safe search

**Files:**

- Create: `apps/api/src/modules/candidates/{domain,application,infrastructure,http}/**`
- Create: `apps/api/prisma/migrations/20260820010300_candidates/migration.sql`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/candidates/candidate.integration-spec.ts`, `apps/api/test/candidates/candidate-permissions.e2e-spec.ts`

**Interfaces:** `CandidateService.create/update/addOccupationProfile/archive`; `GET/POST/PATCH /candidates`; saved views query ports.

- [x] Write failing tests for independent statuses, multi-occupation profile, dynamic schema boundary, sensitive mask, archive guard, stable scoped search and optimistic conflict.
- [x] Run candidate suites and preserve RED evidence.
- [x] Implement normalization/value objects, encrypted sensitive fields/blind index port, repositories, serializer and endpoints.
- [x] Ensure list/search applies scope/field classification in SQL/serializer and rejects arbitrary filter/sort.
- [x] Run AC-22 dynamic schema, canonical backend contract and scoped permission checks; scan logs for sensitive fixtures.
- [ ] Commit: `feat(candidates): add scoped multi-industry profiles` (commit remains a human integration gate).

### Task 4: Implement duplicate review, merge and import pipeline

**Files:**

- Create: `apps/api/src/modules/candidates/application/{duplicate.service.ts,merge.service.ts,import.service.ts}`
- Create: `apps/api/src/modules/candidates/infrastructure/import/*`, `apps/api/src/modules/candidates/workers/import.processor.ts`
- Create: `apps/api/prisma/migrations/20260820010400_candidate_import_merge/migration.sql`
- Create: `apps/api/test/candidates/import-replay.integration-spec.ts`, `apps/api/test/candidates/merge.e2e-spec.ts`
- Modify: `packages/contracts/openapi/cms.yaml`

**Interfaces:** upload/parse/map/preview/commit job states; `CandidateService.merge`; deterministic row key and signed preview token.

- [x] Write failing/contract tests for exact passport/email/phone cases, import replay, partial row atomicity, merge conflict and cross-scope deny.
- [x] Run focused integration/E2E tests against PostgreSQL and retain the RED-to-GREEN evidence in [Task 4 evidence](../phase-1a-task-4-evidence.md).
- [x] Implement bounded import parsing, allowlisted mapping, 500-row limit, masked error report and progress state.
- [x] Implement merge preview token, winner/loser alias, relationship safety checks, audit/outbox; never mutate historical email/audit owner.
- [x] Run AC-02, AC-17, AC-18, AC-21 and security/log regression tests.
- [ ] Commit: `feat(candidates): add idempotent import and reviewed merge` (commit remains a human integration gate).

### Task 5: Implement Application state and requirement snapshots

**Files:**

- Create: `apps/api/src/modules/applications-interviews/domain/application.aggregate.ts`
- Create: `apps/api/src/modules/applications-interviews/application/application.service.ts`
- Create: `apps/api/src/modules/applications-interviews/infrastructure/application.repository.ts`
- Create: `apps/api/src/modules/applications-interviews/http/applications.controller.ts`
- Create: `apps/api/prisma/migrations/20260820010500_applications/migration.sql`
- Create: `apps/api/test/applications/application-concurrency.integration-spec.ts`, `apps/api/test/applications/application.e2e-spec.ts`

**Interfaces:** `ApplicationService.create/transition`; one active attempt partial unique; immutable requirement snapshot.

- [x] Write transition matrix/terminal/permission tests and two-concurrent-create test against PostgreSQL.
- [x] Run tests and verify unique/status/snapshot failures.
- [x] Implement service transaction with Candidate/Order re-check, snapshot, history, audit and outbox; map constraint conflict to `ACTIVE_APPLICATION_EXISTS`.
- [x] Implement scoped list/detail/saved passed view and canonical error responses.
- [x] Run AC-01, AC-18, AC-23, AC-31 and generated contract tests.
- [ ] Commit: `feat(applications): add versioned recruitment attempts` (commit remains a human integration gate).

### Task 6: Implement multi-round Interview and saved views

**Files:**

- Create: `apps/api/src/modules/applications-interviews/domain/interview.aggregate.ts`
- Create: `apps/api/src/modules/applications-interviews/application/interview.service.ts`
- Create: `apps/api/src/modules/applications-interviews/infrastructure/interview.repository.ts`
- Create: `apps/api/src/modules/applications-interviews/http/interviews.controller.ts`
- Create: `apps/api/prisma/migrations/20260820010600_interviews/migration.sql`
- Create: `apps/api/test/interviews/interview.integration-spec.ts`, `apps/api/test/interviews/interview.e2e-spec.ts`

**Interfaces:** `InterviewService.create/reschedule/complete/cancel`; `/views/waiting-interviews`, `/views/interviewed`.

- [x] Write failing/contract tests for atomic round number, schedule validation, reschedule history, immutable question snapshot, required feedback and saved-view overlap.
- [x] Run focused suites and confirm the implementation fails closed when no active template exists.
- [x] Implement unique handling, status/history/snapshot, explicit completion/cancellation commands, audit/outbox and reminder-cancel event.
- [x] Add saved-view repository queries with stable cursor/scope and canonical OpenAPI paths.
- [x] Run AC-03, AC-18, AC-24, AC-31 and full Phase 1A regression.
- [ ] Commit: `feat(interviews): add auditable multi-round workflow` (commit remains a human integration gate).

### Phase 1A checkpoint

- [x] Run all available commands in [test strategy](../11-testing-and-release-gates.md#3-canonical-commands); see [checkpoint evidence](../phase-1a-checkpoint-evidence.md).
- [ ] QA maps passing test IDs to AC-01–03, AC-17–18, AC-21–24, AC-31.
- [ ] Product Owner UATs candidate/order/application/interview using synthetic multi-industry data.
- [ ] Backend Tech Lead verifies [Phase 1A DoD](../14-definition-of-done.md#4-phase-1a-dod).
