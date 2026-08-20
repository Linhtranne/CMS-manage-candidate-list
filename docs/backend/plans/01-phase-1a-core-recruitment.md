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

**Interfaces:** `CatalogService.createDraft/activate/retire`; `GET/POST /catalog/{type}`, explicit activation/retirement endpoints.

- [ ] Write state-table tests for `DRAFT -> ACTIVE -> RETIRED`, active/reference immutability, ambiguous version and question template snapshot inputs.
- [ ] Run catalog tests and confirm missing repository/constraints fail.
- [ ] Implement identity/version tables, JSON Schema subset validator, application service, policy actions and canonical envelopes/errors.
- [ ] Add technical seed only for permission/reason codes; business catalog activation reads approved artifact checksum.
- [ ] Run migration/unit/integration/contract/E2E tests and generated client check.
- [ ] Commit: `feat(catalog): add immutable versioned catalogs`.

### Task 2: Implement Client, Contact and JobOrder

**Files:**

- Create: `apps/api/src/modules/clients-orders/{domain,application,infrastructure,http}/**`
- Create: `apps/api/prisma/migrations/20260820010200_clients_orders/migration.sql`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/clients-orders/job-order.integration-spec.ts`, `apps/api/test/clients-orders/job-order.e2e-spec.ts`

**Interfaces:** `ClientService`, `JobOrderService.create/updateRequirement/transition`; JobOrder status table from spec 05.

- [ ] Write failing tests for invalid quantity/deadline/catalog, transition matrix, contact masking, requirement version snapshot and version conflict.
- [ ] Run focused tests; verify missing tables/routes produce expected failures.
- [ ] Implement aggregate/repositories/DTOs/endpoints with scope SQL, optimistic concurrency, history/audit/outbox.
- [ ] Add partial/stable list indexes and cursor `(sortValue,id)`; contract examples/errors for every operation.
- [ ] Run AC-oriented module E2E plus query plan fixture.
- [ ] Commit: `feat(orders): add clients and versioned job orders`.

### Task 3: Implement Candidate profiles and safe search

**Files:**

- Create: `apps/api/src/modules/candidates/{domain,application,infrastructure,http}/**`
- Create: `apps/api/prisma/migrations/20260820010300_candidates/migration.sql`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/candidates/candidate.integration-spec.ts`, `apps/api/test/candidates/candidate-permissions.e2e-spec.ts`

**Interfaces:** `CandidateService.create/update/addOccupationProfile/archive`; `GET/POST/PATCH /candidates`; saved views query ports.

- [ ] Write failing tests for independent statuses, multi-occupation profile, dynamic schema, sensitive mask, archive guard, stable scoped search and optimistic conflict.
- [ ] Run candidate suites and preserve RED evidence.
- [ ] Implement normalization/value objects, encrypted sensitive fields/blind index port, repositories, serializer and endpoints.
- [ ] Ensure list/search applies scope/field classification in SQL/serializer and rejects arbitrary filter/sort.
- [ ] Run AC-22, AC-28 backend-contract, AC-31 and permission E2E; scan logs for sensitive fixtures.
- [ ] Commit: `feat(candidates): add scoped multi-industry profiles`.

### Task 4: Implement duplicate review, merge and import pipeline

**Files:**

- Create: `apps/api/src/modules/candidates/application/{duplicate.service.ts,merge.service.ts,import.service.ts}`
- Create: `apps/api/src/modules/candidates/infrastructure/import/*`, `apps/api/src/modules/candidates/workers/import.processor.ts`
- Create: `apps/api/prisma/migrations/20260820010400_candidate_import_merge/migration.sql`
- Create: `apps/api/test/candidates/import-replay.integration-spec.ts`, `apps/api/test/candidates/merge.e2e-spec.ts`
- Modify: `packages/contracts/openapi/cms.yaml`

**Interfaces:** upload/parse/map/preview/commit job states; `CandidateService.merge`; deterministic row key and signed preview token.

- [ ] Write failing tests for exact passport/email/phone cases, ambiguous fuzzy review, import replay, partial row atomicity, merge conflict and cross-scope deny.
- [ ] Run focused integration/E2E tests; confirm RED.
- [ ] Implement streaming parse with file/type/row limits, catalog mapping allowlist, 500-row chunks, masked error report and progress API.
- [ ] Implement merge preview token, winner/loser alias, relationship safety checks, audit/outbox; never mutate historical email/audit owner.
- [ ] Run AC-02, AC-17, AC-18, AC-21 and security/log tests.
- [ ] Commit: `feat(candidates): add idempotent import and reviewed merge`.

### Task 5: Implement Application state and requirement snapshots

**Files:**

- Create: `apps/api/src/modules/applications-interviews/domain/application.aggregate.ts`
- Create: `apps/api/src/modules/applications-interviews/application/application.service.ts`
- Create: `apps/api/src/modules/applications-interviews/infrastructure/application.repository.ts`
- Create: `apps/api/src/modules/applications-interviews/http/applications.controller.ts`
- Create: `apps/api/prisma/migrations/20260820010500_applications/migration.sql`
- Create: `apps/api/test/applications/application-concurrency.integration-spec.ts`, `apps/api/test/applications/application.e2e-spec.ts`

**Interfaces:** `ApplicationService.create/transition`; one active attempt partial unique; immutable requirement snapshot.

- [ ] Write transition matrix/terminal/permission tests and two-concurrent-create test against PostgreSQL.
- [ ] Run tests and verify unique/status/snapshot failures.
- [ ] Implement service transaction with Candidate/Order re-check, snapshot, history, audit and outbox; map constraint conflict to `ACTIVE_APPLICATION_EXISTS`.
- [ ] Implement scoped list/detail/saved passed view and canonical error responses.
- [ ] Run AC-01, AC-18, AC-23, AC-31 and generated contract tests.
- [ ] Commit: `feat(applications): add versioned recruitment attempts`.

### Task 6: Implement multi-round Interview and saved views

**Files:**

- Create: `apps/api/src/modules/applications-interviews/domain/interview.aggregate.ts`
- Create: `apps/api/src/modules/applications-interviews/application/interview.service.ts`
- Create: `apps/api/src/modules/applications-interviews/infrastructure/interview.repository.ts`
- Create: `apps/api/src/modules/applications-interviews/http/interviews.controller.ts`
- Create: `apps/api/prisma/migrations/20260820010600_interviews/migration.sql`
- Create: `apps/api/test/interviews/interview.integration-spec.ts`, `apps/api/test/interviews/interview.e2e-spec.ts`

**Interfaces:** `InterviewService.create/reschedule/complete/cancel`; `/views/waiting-interviews`, `/views/interviewed`.

- [ ] Write failing tests for atomic round number, schedule validation, reschedule history, immutable question snapshot, required feedback and saved-view overlap.
- [ ] Run focused suites and confirm missing implementation fails.
- [ ] Implement lock/unique handling, status/history/snapshot, explicit completion/cancellation commands, audit/outbox and reminder-cancel event.
- [ ] Add saved-view repository queries with stable cursor/scope and contract examples.
- [ ] Run AC-03, AC-18, AC-24, AC-31 and full Phase 1A regression.
- [ ] Commit: `feat(interviews): add auditable multi-round workflow`.

### Phase 1A checkpoint

- [ ] Run all commands in [test strategy](../11-testing-and-release-gates.md#3-canonical-commands).
- [ ] QA maps passing test IDs to AC-01–03, AC-17–18, AC-21–24, AC-31.
- [ ] Product Owner UATs candidate/order/application/interview using synthetic multi-industry data.
- [ ] Backend Tech Lead verifies [Phase 1A DoD](../14-definition-of-done.md#4-phase-1a-dod).
