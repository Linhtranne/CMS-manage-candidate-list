---
title: Phase 2-4 technical implementation evidence
status: technical_implementation_external_gates_closed
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: high
---

# Phase 2–4 technical implementation evidence

Updated: 2026-08-24

## Verdict

The Phase 2 journey/document path and the Phase 3–4 task/report/export/audit/retention foundations are implemented in the backend worktree and pass local regression. This is a technical checkpoint, not a production approval. Provider/storage/scanner activation, bulk export, purge, performance/restore rehearsal and named UAT/release approvals remain fail-closed.

## Implemented

- Journey template versioning, applicability, checksum binding and activation gate.
- Preview-bound atomic journey start with application version/context binding, idempotency and one-effective-journey constraint.
- Milestone state machine with dependency DAG, CAS version, history, attempts, evidence and waiver/reopen approval gates.
- Journey lifecycle hold/resume/complete/cancel with milestone and blocking-work gates, audit and outbox side effects.
- Versioned private documents with candidate/journey/milestone links, checksum/MIME/scan states, signed upload/download ports and access audit. Object storage/scanner adapters are disabled by default and no object key is returned from API views.
- Task/rule consumer with deterministic dedupe and explicit create/cancel-open handling; source aggregates are not mutated by task completion.
- Canonical report registry/query guard, scoped projection repository/processor, half-open windows and zero-denominator semantics.
- Asynchronous export request contract with purpose/scope snapshot, restricted-field guard and `enabled=false` fail-closed gate.
- Scoped audit query, versioned retention policy/legal-hold tables, dry-run and `PURGE_ENABLED=false` execution gate.
- OpenAPI document upload/link requests and regenerated generated contract types.
- Typed activation gates now validate DEC-001/004/005 records, keep safe defaults,
  and compose storage/scanner/export/retention through explicit fail-closed factories.
- Queue worker bootstrap now rejects missing, duplicate or unconfigured handlers;
  production preflight checks the declared `DATABASE_RUNTIME_ROLE` against the
  connection username and rejects the `cms_api` `NOLOGIN` role.

## Fresh verification

```text
API full suite: 64 files passed, 4 skipped; 215 tests passed, 15 skipped
Focused milestone/document/report/retention suites: 4 files passed; 7 tests passed
API typecheck: passed
API lint + module boundaries: passed; MODULE_BOUNDARY_VIOLATIONS=0
API build: passed
Contracts generate + test: 7 tests passed
Workspace typecheck/lint/build (API, web, contracts): passed
Docker migration runtime: 7 pending migrations applied successfully; `prisma migrate status` reports schema up to date.
Container smoke: `http://127.0.0.1:3100/api/v1/health/live` returned HTTP 200 after rebuilding the API image.
Readiness smoke: `/api/v1/health/ready` returned HTTP 200 with database and queue checks `ok`; machine-readable record is [runtime smoke evidence](../../apps/api/ops/evidence/phase-2-4-runtime-smoke.json).
```

## External gates still closed

- DEC-003/004/005 provider, template/privacy and document authority approvals.
- Real object storage, malware scanner and email provider staging smoke.
- Production database role provisioning, backup/PITR and object restore evidence. Local container verification confirms `cms_api` is `NOLOGIN` with SELECT/INSERT/UPDATE on Phase 2–4 tables and no DELETE grant.
- Approved 100k/200-user load profile, alert rehearsal, security-owner review and named Product/Backend/QA/Security/Operations UAT/release sign-off.
- Bulk export and purge activation records.
- Real provider/client bindings and credential-backed smoke remain external by design.
