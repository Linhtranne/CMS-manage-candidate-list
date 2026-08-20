# Phase 2 Supply Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triển khai lộ trình cung ứng theo template/context, milestone DAG, attempts/evidence/documents và task/email integration có kiểm soát.

**Architecture:** SupplyJourney aggregate snapshot exact template version. Milestone service enforce dependency/state/evidence; Document aggregate sở hữu immutable binary versions. Side effects thành tasks/email requests qua outbox, không cập nhật chéo trong consumer.

**Tech Stack:** Phase 0–1 stack + S3-compatible private storage/scanner ports từ Phase 1B (hoặc cùng interface fake nếu 1B chưa hoàn tất).

**Spec:** [Journey/Documents](../06-supply-journey-and-documents.md), [Data](../04-data-prisma-and-migrations.md), [Tasks/Audit](../08-tasks-reports-admin-audit.md).

**Global Constraints:** DEC-004/005 phải approved trước activation/UAT production-like. Không có Flight aggregate. Không tự migrate Journey đã chạy khi template đổi. Email/attachment không tự complete milestone.

### Task 1: Implement Journey Template version and applicability compiler

**Files:**

- Create: `apps/api/src/modules/supply-journeys/domain/journey-template.ts`, `applicability-expression.ts`
- Create: `apps/api/src/modules/supply-journeys/application/journey-template.service.ts`
- Create: `apps/api/src/modules/supply-journeys/infrastructure/journey-template.repository.ts`
- Create: `apps/api/prisma/migrations/20260820030100_journey_templates/migration.sql`
- Create: `apps/api/test/journeys/template-applicability.integration-spec.ts`

**Interfaces:** specificity order residence+visa+case+occupation/sector/global; DSL only `eq/in/and/or/exists`; activate requires DAG and valid schemas.

- [ ] Write failing tests for every specificity level, ambiguity/no-match, invalid remote ref/script/expression, cyclic dependency and immutable active version.
- [ ] Run template tests and confirm RED.
- [ ] Implement version tables/compiler/validator/repository and approved seed checksum gate.
- [ ] Add activation endpoints/permissions/audit without auto-activating DEC-004 data.
- [ ] Run migration/unit/integration/contract tests.
- [ ] Commit: `feat(journey): add versioned applicable templates`.

### Task 2: Implement Journey preview and atomic start

**Files:**

- Create: `apps/api/src/modules/supply-journeys/domain/supply-journey.aggregate.ts`
- Create: `apps/api/src/modules/supply-journeys/application/supply-journey.service.ts`
- Create: `apps/api/src/modules/supply-journeys/infrastructure/supply-journey.repository.ts`
- Create: `apps/api/src/modules/supply-journeys/http/supply-journeys.controller.ts`
- Create: `apps/api/prisma/migrations/20260820030200_supply_journeys/migration.sql`
- Create: `apps/api/test/journeys/journey-start-concurrency.integration-spec.ts`, `apps/api/test/journeys/journey-start.e2e-spec.ts`

**Interfaces:** preview token bound to Application/template/context/version; `SupplyJourneyService.previewStart/start`; one effective Journey partial unique.

- [ ] Write failing tests for non-PASSED Application, expired/stale preview, candidate mismatch, unresolved owner, idempotent replay and two concurrent passed Applications.
- [ ] Run focused tests; verify database allows invalid state before implementation.
- [ ] Implement serializable/advisory-lock transaction creating journey, milestone snapshots/dependencies, initial tasks, audit/outbox.
- [ ] Map unique/conflict errors deterministically; add timeline detail scoped endpoint.
- [ ] Run AC-04, AC-25, AC-31 and permission/contract tests.
- [ ] Commit: `feat(journey): start one contextual supply journey atomically`.

### Task 3: Implement Milestone transitions, dependency and attempts

**Files:**

- Create: `apps/api/src/modules/supply-journeys/domain/journey-milestone.aggregate.ts`
- Create: `apps/api/src/modules/supply-journeys/application/journey-milestone.service.ts`
- Create: `apps/api/src/modules/supply-journeys/http/journey-milestones.controller.ts`
- Create: `apps/api/prisma/migrations/20260820030300_journey_milestones/migration.sql`
- Create: `apps/api/test/journeys/milestone-state.integration-spec.ts`, `apps/api/test/journeys/milestone-exceptions.e2e-spec.ts`

**Interfaces:** explicit start/block/completion/waiver/not-applicable/attempt endpoints; dependency satisfied only by terminal acceptable states.

- [ ] Write full transition allow/deny table tests, dependency tests, atomic attempt number, waive permission/approval, N/A applicability and reopen audit tests.
- [ ] Run tests and preserve RED output.
- [ ] Implement aggregate commands/history/CAS version, dependency query, checklist/schema validation and approval hooks.
- [ ] Implement hold/resume/cancel and ensure terminal Journey/milestone reject generic patch.
- [ ] Run AC-20, AC-25, AC-31 and transition coverage report.
- [ ] Commit: `feat(journey): enforce milestone dependencies and exceptions`.

### Task 4: Implement Document upload, version, link and access audit

**Files:**

- Create: `apps/api/src/modules/documents/{domain,application,infrastructure,http,workers}/**`
- Create: `apps/api/prisma/migrations/20260820030400_documents/migration.sql`
- Create: `apps/api/test/documents/document-security.integration-spec.ts`, `apps/api/test/documents/document.e2e-spec.ts`
- Modify: `packages/contracts/openapi/cms.yaml`

**Interfaces:** `DocumentService.createUpload/finalizeUpload/link/createDownload`; immutable versions; only SAFE/same Candidate evidence.

- [ ] Write failing tests for forged checksum/MIME, unsafe state, cross-Candidate/scope link, signed URL expiry, version replacement, legal hold/purge guard.
- [ ] Run document tests and confirm RED.
- [ ] Implement quarantine/finalize/scan state, private object key/checksum metadata, version/link history, sensitive download permission and access audit.
- [ ] Implement evidence validator consumed by Milestone complete; do not expose object key.
- [ ] Run AC-09 security cases reused from email, AC-20 evidence and AC-27 access tests.
- [ ] Commit: `feat(documents): add safe versioned journey evidence`.

### Task 5: Integrate tasks, notifications and completion

**Files:**

- Create: `apps/api/src/modules/tasks-reporting/application/task-rule.consumer.ts`
- Create: `apps/api/src/modules/supply-journeys/application/journey-completion.service.ts`
- Create: `apps/api/test/journeys/journey-side-effects.integration-spec.ts`, `apps/api/test/journeys/journey-completion.e2e-spec.ts`
- Modify: `apps/api/src/modules/email-hub/application/email-rule.consumer.ts`

**Interfaces:** deterministic task key; event request only; Journey complete validates milestones/evidence/tasks before terminal transition.

- [ ] Write failing tests for event replay, block/unblock task, reminder stop, inbound attachment handoff, no auto-completion and completion blockers.
- [ ] Run integration/E2E tests and confirm RED.
- [ ] Implement idempotent consumers and explicit complete/cancel services; close/cancel side-effect tasks in transaction where owned or via replay-safe events.
- [ ] Add journey progress/overdue metrics without high-cardinality labels or PII.
- [ ] Run AC-04, AC-08, AC-20, AC-25, AC-32 and full Phase 2 regression.
- [ ] Commit: `feat(journey): integrate tasks notifications and completion`.

### Phase 2 checkpoint

- [ ] DEC-004 template/evidence/authority and applicable DEC-005 privacy records are approved/checksummed.
- [ ] Product/Japan Operations UAT at least two context templates, including one without required departure milestone.
- [ ] Security verifies document/link/download/access-audit controls.
- [ ] Backend Tech Lead verifies [Phase 2 DoD](../14-definition-of-done.md#6-phase-2-dod).
