# Backend Activation Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the key-independent backend activation contract and production-readiness wiring while preserving fail-closed behavior until external approvals and credentials exist.

**Architecture:** Runtime configuration owns typed activation gates and server-owned approval records. Infrastructure ports are composed through factories with disabled defaults and explicit unbound failures. Release checks consume immutable evidence and do not treat local green tests as production approval.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, Redis/BullMQ-compatible queue ports, Vitest, Docker Compose, Node release scripts.

**Spec:** `docs/superpowers/specs/2026-08-24-backend-activation-readiness-design.md`

## Global Constraints

- Never commit or print real secrets.
- `MAIL_PROVIDER=DISABLED` remains safe default; `FAKE` is development/test only.
- Production/staging high-risk features require a valid server-owned approval record; env flags alone are insufficient.
- No destructive migration or worktree reset.
- Run lint/typecheck/tests/build after each implementation group.

---

### Task 1: Add typed activation configuration and approval-record validation

**Files:**
- Modify: `apps/api/src/platform/config/config.schema.ts`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Test: `apps/api/test/config/config.e2e-spec.ts`

**Interfaces:**
- Produce `RuntimeConfig.activation` with `catalog`, `documents`, `exports`, `retention`, and `breakGlass` gates.
- Produce `readActivationRecord(path, decisionId, environment)` validation with checksum, scope, status, and non-placeholder approvals.

- [x] Add failing tests for absent, malformed, wrong-decision, out-of-scope, and valid activation records.
- [x] Implement typed config parsing and fail-closed defaults.
- [x] Pass server-owned activation paths through Compose without exposing contents.
- [x] Run config tests, typecheck, and lint.

### Task 2: Wire storage/scanner/export/retention composition

**Files:**
- Modify: `apps/api/src/modules/documents/documents.module.ts`
- Modify: `apps/api/src/modules/tasks-reporting/tasks-reporting.module.ts`
- Modify: `apps/api/src/modules/retention/retention.module.ts`
- Create/modify: `apps/api/src/platform/storage/object-storage.factory.ts`
- Create/modify: `apps/api/src/platform/files/file-scanner.factory.ts`
- Test: `apps/api/test/documents/*`, `apps/api/test/reports/*`, `apps/api/test/retention/*`

**Interfaces:**
- Disabled adapters remain bound when gates are absent.
- Configured real adapters must be explicit constructor providers; missing client binding throws a stable startup error.

- [x] Add composition tests for disabled and configured-but-unbound paths.
- [x] Implement factories without embedding vendor credentials.
- [x] Replace hard-coded `false` service construction with typed activation decisions.
- [x] Run focused document/report/retention tests.

### Task 3: Complete queue handler registry and runtime role handoff

**Files:**
- Modify: `apps/api/src/platform/queue/queue.service.ts`
- Modify: `apps/api/src/bootstrap/worker.ts`
- Modify: `apps/api/src/bootstrap/scheduler.ts`
- Modify: `apps/api/src/platform/config/config.schema.ts`
- Modify: `docker-compose.prod.yml`
- Test: `apps/api/test/resilience/queue-health.spec.ts`
- Docs: `apps/api/runbooks/queue-recovery.md`, `docs/backend/04-data-prisma-and-migrations.md`

- [x] Assert each enabled queue has a registered handler before strict-environment startup.
- [x] Add worker/scheduler startup safety and graceful shutdown documentation.
- [x] Document the production `LOGIN` runtime role and least-privilege grants.
- [x] Run queue tests and development compose config validation.

### Task 4: Complete security and release evidence gates

**Files:**
- Modify: `.github/workflows/security-release.yml`
- Modify: `apps/api/scripts/production-preflight.mjs`
- Modify: `apps/api/scripts/create-release-manifest.mjs`
- Modify: `apps/api/ops/evidence/release-manifest.schema.yaml`
- Test: `apps/api/test/security/*`, release script tests where present
- Docs: `docs/backend/plans/04-phase-3-4-reporting-go-live.md`

- [x] Make security/SBOM/secret/container/DAST scan artifacts explicit inputs to production release.
- [x] Ensure release manifest records the activation scope and security-artifact checksums.
- [x] Preserve clean-worktree, runtime-role and digest-match checks.
- [x] Run security tests, release script syntax checks, typecheck, lint, build, and full API suite.

### Task 5: Runtime and documentation verification

**Files:**
- Modify: `docs/backend/phase-2-4-implementation-evidence.md`
- Modify: `docs/backend/README.md`
- Create/modify: `apps/api/ops/evidence/phase-2-4-runtime-smoke.json`

- [x] Run migrations/status and Docker live/ready smoke.
- [x] Verify config validation remains typed and does not print secret values.
- [x] Record exactly which external gates remain blocked pending keys/approvals.
- [x] Report production blockers separately from completed local evidence.
