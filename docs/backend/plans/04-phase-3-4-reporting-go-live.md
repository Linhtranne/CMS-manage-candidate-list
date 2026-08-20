# Phase 3-4 Reporting and Go-live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hoàn tất task/report/export/admin/audit/retention, hardening, performance, recovery, UAT và production go-live có bằng chứng.

**Architecture:** Read models/materialized projections phục vụ report; export/retention là async jobs; admin không bypass domain/permission. Release dùng immutable image, compatible migration, canary và evidence manifest.

**Tech Stack:** Existing backend stack + report projection jobs, CSV streaming, OpenTelemetry dashboards, container/SBOM/security scanners, backup/PITR tooling do DEC-006 chọn.

**Spec:** [Tasks/Reports/Admin/Audit](../08-tasks-reports-admin-audit.md), [Security](../09-security-privacy-threat-model.md), [Operations/DR](../10-observability-operations-dr.md), [Testing/Release](../11-testing-and-release-gates.md).

**Global Constraints:** DEC-005–007 phải approved cho production. Bulk export/purge/break-glass giữ disabled đến exact approval/activation. Không tuyên bố production-ready bằng local/CI green nếu thiếu runtime/provider/DR evidence.

### Task 1: Implement Task service and versioned rule consumers

**Files:**

- Create: `apps/api/src/modules/tasks-reporting/{domain,application,infrastructure,http}/task*`
- Create: `apps/api/prisma/migrations/20260820040100_tasks_rules/migration.sql`
- Create: `apps/api/test/tasks/task-rules.integration-spec.ts`, `apps/api/test/tasks/tasks.e2e-spec.ts`
- Modify: `packages/contracts/openapi/cms.yaml`

**Interfaces:** `TaskService.create/assign/start/complete/cancel`; deterministic rule dedupe; waitingOn is filter, not state.

- [ ] Write failing transition/assignment/scope/replay/owner-transfer tests.
- [ ] Run task suites and confirm RED.
- [ ] Implement aggregate/repository/endpoints/rule consumer and ownership transfer transaction behavior.
- [ ] Ensure completing Task never changes source aggregate implicitly.
- [ ] Run AC-21, AC-31, AC-32 and permission/contract tests.
- [ ] Commit: `feat(tasks): add scoped replay-safe work management`.

### Task 2: Implement canonical reports and projections

**Files:**

- Create: `apps/api/src/modules/tasks-reporting/application/report-definition.registry.ts`, `report-query.service.ts`
- Create: `apps/api/src/modules/tasks-reporting/infrastructure/report-projection.repository.ts`
- Create: `apps/api/src/modules/tasks-reporting/workers/report-projection.processor.ts`
- Create: `apps/api/prisma/migrations/20260820040200_report_projections/migration.sql`
- Create: `apps/api/test/reports/report-golden-dataset.integration-spec.ts`, `apps/api/test/reports/reports.e2e-spec.ts`

**Interfaces:** report codes/definitions from spec 08; `{ numerator, denominator, value|null }`; `[from,to)` converted from requested IANA timezone.

- [ ] Write golden dataset tests for all eight canonical reports, zero/null, cohort/window, late event, scope and timezone/DST edges.
- [ ] Run report tests and confirm RED.
- [ ] Implement versioned registry, allowlisted filters/grouping, scoped SQL/projection watermark/freshness and query-cost guard.
- [ ] Capture representative query plans/index changes in migration evidence.
- [ ] Run report integration/E2E and AC-10 scope checks.
- [ ] Commit: `feat(reports): add defined scoped operational metrics`.

### Task 3: Implement secure asynchronous export

**Files:**

- Create: `apps/api/src/modules/tasks-reporting/application/report-export.service.ts`
- Create: `apps/api/src/modules/tasks-reporting/workers/report-export.processor.ts`
- Create: `apps/api/src/modules/tasks-reporting/http/report-exports.controller.ts`
- Create: `apps/api/prisma/migrations/20260820040300_report_exports/migration.sql`
- Create: `apps/api/test/reports/export-security.integration-spec.ts`

**Interfaces:** request/status/download; immutable scope/policy snapshot; streaming UTF-8 CSV; private encrypted object; short-lived download ticket.

- [ ] Write failing tests for disabled flag, purpose/reason, scope revoke, CSV formula injection, restricted-column deny, replay, expiry and access audit.
- [ ] Run export suite and verify RED.
- [ ] Implement estimate/queue/generate/download/expire flow with per-requester limits and no restricted data by default.
- [ ] Add alert for abnormal volume and purge object by approved export retention.
- [ ] Run AC-11, AC-17, AC-27, AC-32 and redaction/security tests.
- [ ] Commit: `feat(exports): add policy-bound asynchronous reports`.

### Task 4: Implement Admin, audit query and retention controls

**Files:**

- Create: `apps/api/src/modules/admin/{application,http}/**`
- Create: `apps/api/src/modules/audit/{application,http}/audit-query*`
- Create: `apps/api/src/modules/retention/{application,infrastructure,workers,http}/**`
- Create: `apps/api/prisma/migrations/20260820040400_admin_retention/migration.sql`
- Create: `apps/api/test/admin/admin-boundaries.e2e-spec.ts`, `apps/api/test/retention/legal-hold.integration-spec.ts`

**Interfaces:** code-owned permissions; explicit job commands; audit scoped query; retention dry-run/approval/execute; legal hold blocks purge.

- [ ] Write failing tests proving Admin lacks PII/email/document, audit table mutation denied, job retry requires state/reason, purge disabled and legal hold blocks DB/object deletion.
- [ ] Run tests and confirm RED.
- [ ] Implement narrow admin endpoints, audit access control, retention policy versions/legal hold/dry-run approval/execution and purge evidence.
- [ ] Keep `PURGE_ENABLED=false` unless DEC-005 activation record is present; no generic data editor/query endpoint.
- [ ] Run AC-10–11, AC-27 and security/migration tests.
- [ ] Commit: `feat(admin): enforce audited operational boundaries`.

### Task 5: Complete security and supply-chain hardening

**Files:**

- Create: `apps/api/test/security/{api-abuse.e2e-spec.ts,pii-redaction.integration-spec.ts}`
- Create: `.github/workflows/security-release.yml`
- Create: `apps/api/security/threat-register.yaml`, `apps/api/security/accepted-risks.yaml`
- Modify: `apps/api/Dockerfile`, `docker-compose.prod.yml`

**Interfaces:** CI artifacts for SAST/dependency/secret/container/SBOM/DAST; risk acceptance needs owner/expiry.

- [ ] Add failing malicious corpus tests for CSRF/BOLA/mass assignment/injection/SSRF/XSS/upload/webhook/rate-limit and sentinel leak scan.
- [ ] Run security suite/scanners; classify real failures before code changes.
- [ ] Implement exact hardening/configuration fixes and non-root/read-only/private-network image controls.
- [ ] Generate SBOM, pin image/dependency provenance and ensure no critical/high without valid accepted-risk record.
- [ ] Run complete security release workflow and Security Owner review.
- [ ] Commit: `security: enforce production release controls`.

### Task 6: Prove performance, observability and recovery

**Files:**

- Create: `apps/api/test/performance/{seed-profile.ts,mixed-load.js}`
- Create: `apps/api/ops/dashboards/*.json`, `apps/api/ops/alerts/*.yaml`
- Create: `apps/api/runbooks/{database-restore.md,object-restore.md,queue-recovery.md,migration-failure.md,release-rollback.md}`
- Create: `apps/api/ops/evidence/release-manifest.schema.yaml`

**Interfaces:** approved DEC-006 SLO/RPO/RTO/load thresholds; real dashboards/alerts/runbooks and restore evidence IDs.

- [ ] Encode approved 100k-candidate/200-user mixed profile and assert SLO/error/headroom gates.
- [ ] Run baseline load; use measured query/pool/queue/storage/provider evidence to tune bounded concurrency/indexes.
- [ ] Provision dashboards/alerts; trigger and recover each critical alert in staging.
- [ ] Execute DB PITR + object restore + outbox/queue reconciliation; verify checksums, links, auth and critical workflow within RPO/RTO.
- [ ] Re-run load/soak/restart/SIGTERM tests and publish signed evidence manifest.
- [ ] Commit: `ops: prove performance observability and recovery`.

### Task 7: Execute UAT and production release

**Files:**

- Create: `apps/api/ops/evidence/uat/initial-production-release.yaml`
- Create: `apps/api/ops/evidence/releases/initial-production-release.yaml`
- Create: `apps/api/runbooks/go-live.md`
- Modify: `docs/backend/13-traceability.md` only if approved requirement/test mapping changed

**Interfaces:** release manifest fields from spec 11; exact release/image/OpenAPI/migration/decision/test/approval identities.

- [ ] Record the approved semantic release identifier inside both evidence files; load only approved synthetic/staging UAT dataset.
- [ ] Run every AC-01–32 and EM-AC-01–04 with named UAT roles/scopes; collect CI/runtime evidence, not screenshots alone.
- [ ] Verify DEC-001–007 required for enabled scope, security/performance/restore/mail/privacy gates and rollback/kill switches.
- [ ] Deploy migration job -> API canary -> workers -> scheduler; run authenticated critical-path smoke and observation window.
- [ ] Promote only after Product/Backend/QA/Security/Operations approvals; otherwise rollback/disable affected feature and record result.
- [ ] Commit: `chore(release): record backend production evidence` with the release evidence files.

### Phase 3–4 checkpoint

- [ ] All enabled-scope decisions approved; no critical/high open without valid risk acceptance.
- [ ] Full commands, AC/EM, provider, performance, security and recovery suites pass with immutable evidence.
- [ ] Release behavior/current image/migration/provider/metrics verified after deploy.
- [ ] Signatories verify [Phase 3–4 and production DoD](../14-definition-of-done.md#7-phase-34-dod).
