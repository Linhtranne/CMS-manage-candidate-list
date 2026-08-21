# Phase 1A Production Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining Phase 1A Core Recruitment backend so candidate import/duplicate review/merge, applications, and multi-round interviews are production-safe and verifiable on PostgreSQL.

**Architecture:** Keep candidates and applications/interviews as separate aggregate modules. All mutations execute in a Prisma transaction, append audit/outbox effects in the same transaction, enforce scope in service/repository queries, and use database uniqueness/version predicates for concurrency. External fuzzy matching remains disabled until its decision is approved; exact matching is deterministic.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL 17, Redis/BullMQ runtime, Vitest, generated OpenAPI TypeScript contracts.

**Spec:** `docs/backend/05-recruitment-domain.md`, `docs/backend/14-definition-of-done.md`, `docs/backend/plans/01-phase-1a-core-recruitment.md`.

## Global Constraints

- Candidate record, readiness, and contactability statuses remain independent.
- Every write requires session, permission, CSRF, scope, optimistic version, audit, and transactional outbox behavior.
- Candidate import is bounded, replay-safe, row-atomic, and never auto-merges fuzzy duplicates.
- Application requirements and interview questions are immutable snapshots.
- No production business seed or fuzzy threshold is activated without the owning approval artifact.

### Task 1: Candidate import, duplicate review, and merge

**Files:**
- Create: `apps/api/prisma/migrations/20260820010400_candidate_import_merge/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/modules/candidates/application/import.service.ts`
- Create: `apps/api/src/modules/candidates/application/duplicate.service.ts`
- Create: `apps/api/src/modules/candidates/application/merge.service.ts`
- Create: `apps/api/src/modules/candidates/http/candidate-imports.controller.ts`
- Modify: `apps/api/src/modules/candidates/candidates.module.ts`
- Modify: `packages/contracts/openapi/cms.yaml` only when implementation reveals a wire mismatch
- Test: `apps/api/test/candidates/import-replay.integration-spec.ts`, `apps/api/test/candidates/merge.e2e-spec.ts`

**Deliverable:** bounded JSON-row import with deterministic row keys, preview/commit token, exact duplicate cases, scope-safe reviewed merge, and append-only audit/outbox records.

**Verification:** migration rehearsal, replay idempotency, partial row atomicity, cross-scope denial, merge conflict, masked error output, contract and permission tests.

### Task 2: Application aggregate

**Files:**
- Create: `apps/api/prisma/migrations/20260820010500_applications/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/modules/applications-interviews/**`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/applications/application-concurrency.integration-spec.ts`, `apps/api/test/applications/application.e2e-spec.ts`

**Deliverable:** scoped application create/list/detail/transition/withdraw endpoints, active-attempt uniqueness, requirement/profile snapshots, transition history, and event effects.

**Verification:** PostgreSQL two-concurrent-create test, full transition matrix, snapshot immutability, owner/team denial, AC-01/18/23/31.

### Task 3: Multi-round interview and saved views

**Files:**
- Create: `apps/api/prisma/migrations/20260820010600_interviews/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/modules/applications-interviews/domain/interview.types.ts`
- Create: `apps/api/src/modules/applications-interviews/application/interview.service.ts`
- Create: `apps/api/src/modules/applications-interviews/infrastructure/interview.prisma-repository.ts`
- Create: `apps/api/src/modules/applications-interviews/http/interviews.controller.ts`
- Test: `apps/api/test/interviews/interview.integration-spec.ts`, `apps/api/test/interviews/interview.e2e-spec.ts`

**Deliverable:** atomic round allocation, UTC/time-zone validation, immutable question snapshot, reschedule history, completion/cancellation/no-show commands, and waiting/interviewed/passed query views.

**Verification:** PostgreSQL round uniqueness/concurrency, schedule conflict, required feedback, status matrix, reminder-cancel outbox event, scope/permission checks, AC-03/18/24/31.

### Task 4: Phase 1A checkpoint and production rehearsal

**Files:**
- Modify: `docs/backend/plans/01-phase-1a-core-recruitment.md`
- Create: `docs/backend/phase-1a-task-4-evidence.md`, `docs/backend/phase-1a-task-5-evidence.md`, `docs/backend/phase-1a-task-6-evidence.md`, `docs/backend/phase-1a-checkpoint-evidence.md`

**Deliverable:** canonical command output, generated-contract consistency, clean production image, migration upgrade rehearsal, DB privilege proof, health/route smoke, and a phase gate listing any external approval or environment dependency.

**Verification:** `pnpm --filter @cms/api test`, PostgreSQL-backed suite, `pnpm lint`, `pnpm typecheck`, `pnpm build`, docs validation, container smoke, and production-compose health/read-write smoke.
