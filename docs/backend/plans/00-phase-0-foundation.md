# Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo backend production-grade tối thiểu với canonical contract, NestJS runtime, Prisma/PostgreSQL, outbox/queue, OIDC session và authorization fail-closed.

**Architecture:** Một NestJS modular monolith chạy ba process API/worker/scheduler từ cùng image. PostgreSQL là source of truth; Redis/BullMQ là transport; mọi domain event từ transactional outbox. Contract OpenAPI 3.1 sinh types cho frontend/backend.

**Tech Stack:** Node.js >=22.15, pnpm 11, TypeScript 5.9, NestJS 11, Prisma ORM 7 + PostgreSQL adapter, PostgreSQL 17, Redis/BullMQ, Vitest, Supertest, Testcontainers, OpenTelemetry.

**Spec:** [Contract](../01-contract-alignment.md), [Architecture](../02-architecture-and-runtime.md), [IAM](../03-api-iam-and-permissions.md), [Data](../04-data-prisma-and-migrations.md), [Security](../09-security-privacy-threat-model.md).

**Global Constraints:** DEC-001 phải approved trước merge IAM policy; OIDC production/staging bị disabled đến DEC-002. Không local password login. Không chạy migration khi API boot.

### Task 1: Align the canonical OpenAPI contract

**Files:**

- Modify: `packages/contracts/openapi/cms.yaml`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/index.test.ts`
- Create: `packages/contracts/src/contract-rules.test.ts`
- Create: `packages/contracts/scripts/check-breaking-change.mjs`
- Modify: `packages/contracts/package.json`

**Interfaces:** Success `{ data, page?, requestId }`; error `{ error: { code, messageKey, params?, fieldErrors?, currentVersion? }, requestId }`; cookie session + CSRF; canonical enums in spec 01.

- [ ] Add failing tests that require OpenAPI 3.1, global security, standard envelopes, `operationId`, stable cursor pagination, canonical Candidate/JobOrder/Application/Interview/Journey enums and removal of password-login operations.
- [ ] Run `pnpm --filter @cms/contracts test`; verify failures name each current mismatch.
- [ ] Update `cms.yaml` components/security/errors and normalize existing operations without adding backend behavior absent from specs.
- [ ] Generate types and update explicit exports; make contract tests traverse every operation, not five path literals.
- [ ] Run `pnpm --filter @cms/contracts generate && pnpm --filter @cms/contracts typecheck && pnpm --filter @cms/contracts test` and verify no uncommitted generated drift.
- [ ] Commit: `feat(contracts): align production API baseline`.

### Task 2: Scaffold API, worker and scheduler entrypoints

**Files:**

- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/vitest.config.ts`
- Create: `apps/api/src/bootstrap/api.ts`, `apps/api/src/bootstrap/worker.ts`, `apps/api/src/bootstrap/scheduler.ts`
- Create: `apps/api/src/app.module.ts`, `apps/api/src/worker.module.ts`, `apps/api/src/scheduler.module.ts`
- Create: `apps/api/src/platform/config/config.schema.ts`, `apps/api/src/platform/config/config.module.ts`
- Create: `apps/api/test/config/config.e2e-spec.ts`

**Interfaces:** `bootstrapApi(): Promise<void>`, `bootstrapWorker(): Promise<void>`, `bootstrapScheduler(): Promise<void>`; validated config typed by process/environment.

- [ ] Write failing config tests for missing production OIDC/encryption/session key, invalid URL/origin, and valid `MAIL_PROVIDER=DISABLED` safe mode.
- [ ] Run `pnpm --filter @cms/api test:unit`; confirm module/package is absent or tests fail.
- [ ] Add NestJS 11 package/scripts and three isolated bootstraps with ESM imports, UTC, shutdown hooks and environment validation.
- [ ] Add module-boundary lint rule: domain modules may depend on platform ports, never provider internals or another module repository.
- [ ] Run lint, typecheck, unit tests and build for `@cms/api`.
- [ ] Commit: `feat(api): scaffold modular runtime processes`.

### Task 3: Implement PostgreSQL/Prisma base schema and migrations

**Files:**

- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Create: `apps/api/prisma/migrations/20260820000100_foundation/migration.sql`
- Create: `apps/api/prisma/migrations/20260820000100_foundation/README.md`
- Create: `apps/api/src/platform/database/database.module.ts`, `apps/api/src/platform/database/prisma.service.ts`
- Create: `apps/api/test/migrations/foundation.migration-spec.ts`

**Interfaces:** `PrismaService` uses PostgreSQL driver adapter; base tables: IAM/session, audit, outbox, job attempts; UUID/timestamptz/version conventions.

- [ ] Write failing migration tests for zero-to-head, required constraints/indexes, append-only audit DB permissions and app N-1 compatibility fixture.
- [ ] Run `pnpm --filter @cms/api test:migration`; verify absent schema/constraints fail.
- [ ] Implement schema and raw SQL constraints/indexes/roles; create separate deploy script, never `db push`.
- [ ] Implement DB readiness and bounded pool/timeouts; redact connection data from errors.
- [ ] Run migration test twice on fresh PostgreSQL containers and introspect exact constraints.
- [ ] Commit: `feat(database): add production foundation schema`.

### Task 4: Add request context, errors, idempotency, audit and outbox

**Files:**

- Create: `apps/api/src/platform/http/request-context.middleware.ts`, `apps/api/src/platform/http/envelope.interceptor.ts`, `apps/api/src/platform/http/problem.filter.ts`
- Create: `apps/api/src/platform/idempotency/idempotency.service.ts`
- Create: `apps/api/src/modules/audit/audit-writer.ts`
- Create: `apps/api/src/platform/outbox/outbox.repository.ts`, `apps/api/src/platform/outbox/outbox.dispatcher.ts`
- Create: `apps/api/test/platform/command-transaction.integration-spec.ts`

**Interfaces:** `runIdempotent<T>(key, requestHash, execute)`, `AuditWriter.append(tx,event)`, `OutboxRepository.append(tx,event)`; request/correlation IDs propagate to all.

- [ ] Write failing integration tests for same-key replay, same-key different payload, transaction rollback, outbox replay and redaction sentinel.
- [ ] Run integration suite; confirm missing envelope/context/idempotency/outbox behaviors fail.
- [ ] Implement transaction helper that commits aggregate + audit + outbox together and returns canonical envelope/error codes.
- [ ] Implement dispatcher claim with `FOR UPDATE SKIP LOCKED`, schema version and retry metadata; no PII payload.
- [ ] Run integration/contract tests, including simulated crash after commit before dispatch.
- [ ] Commit: `feat(platform): add transactional command infrastructure`.

### Task 5: Implement OIDC session, CSRF and authorization policy

**Files:**

- Create: `apps/api/src/modules/identity-access/domain/permission.registry.ts`
- Create: `apps/api/src/modules/identity-access/application/policy.service.ts`, `apps/api/src/modules/identity-access/application/session.service.ts`
- Create: `apps/api/src/modules/identity-access/http/auth.controller.ts`, `apps/api/src/modules/identity-access/http/guards/*`
- Create: `apps/api/src/modules/identity-access/infrastructure/oidc.adapter.ts`
- Create: `apps/api/test/security/authentication.e2e-spec.ts`, `apps/api/test/security/authorization-matrix.e2e-spec.ts`

**Interfaces:** `PolicyService.assert({ actor, action, resourceScope, sensitivity, reason, approvalId })`; endpoints `/auth/login`, `/auth/callback`, `/auth/session`, `/auth/logout`; no credential/password body.

- [ ] Write failing E2E cases for invalid issuer/audience/state/nonce/PKCE, CSRF missing, deactivated user, owner/team/global allow and cross-scope/sensitivity deny.
- [ ] Run security suite and preserve failing output as task evidence.
- [ ] Seed code-owned action registry and approved DEC-001 role mappings; implement server-side session/cookie/CSRF and OIDC adapter disabled when DEC-002 config absent.
- [ ] Apply policy guard plus service/query re-check; ensure admin lacks content permission by default.
- [ ] Run auth/security/contract E2E; scan response/logs for token/PII sentinels.
- [ ] Commit: `feat(iam): enforce oidc sessions and scoped permissions`.

### Task 6: Add queues, telemetry, health, containers and CI gates

**Files:**

- Create: `apps/api/src/platform/queue/queue.module.ts`, `apps/api/src/platform/telemetry/telemetry.module.ts`, `apps/api/src/platform/health/health.controller.ts`
- Create: `apps/api/Dockerfile`, `apps/api/.dockerignore`
- Modify: `docker-compose.yml`, `docker-compose.prod.yml`, `.env.example`, `package.json`
- Create: `.github/workflows/backend-ci.yml`
- Create: `apps/api/test/resilience/graceful-shutdown.integration-spec.ts`

**Interfaces:** `/health/live`, `/health/ready`, `/health/startup`; queue payload `{ schemaVersion, eventId, correlationId, entityId }`.

- [ ] Write failing health/queue/shutdown tests and CI check for every canonical command in spec 11.
- [ ] Run tests; confirm missing Redis/DB readiness and shutdown behavior are detected.
- [ ] Configure BullMQ prefix/no-PII payload, OpenTelemetry, JSON redacted logs, process heartbeats and graceful SIGTERM.
- [ ] Build non-root read-only image with API/worker/scheduler commands; compose dependencies private with health/resource limits.
- [ ] Run full backend lint/typecheck/unit/integration/contract/migration/security/build plus image smoke.
- [ ] Commit: `ci(api): enforce foundation release gates`.

### Phase 0 checkpoint

- [ ] Backend Tech Lead verifies tasks 1–6 and [Phase 0 DoD](../14-definition-of-done.md#3-phase-0-dod).
- [ ] Product/Security approval records for DEC-001 and required DEC-002 environment scope exist.
- [ ] Tag release candidate only after traceability and evidence manifest contain actual commit/image/OpenAPI/migration IDs.
