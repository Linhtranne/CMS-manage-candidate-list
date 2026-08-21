---
title: Phase 0 Task 6 execution evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
risk: high
---

# Task 6 evidence

Implementation evidence is executable in the repository:

- API exposes `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health/startup` and `/api/v1/metrics`.
- BullMQ queue payloads require `schemaVersion`, `eventId`, `correlationId`, `entityId`, use a configured prefix, and reject sensitive field names.
- API, worker and scheduler use one non-root read-only image definition; Compose explicitly overrides the image entrypoint for worker/scheduler. Queue transport defaults disabled until a real consumer is registered; staging/production reject `QUEUE_ENABLED=true`, and enabling it in local/test without a handler fails worker bootstrap and never acknowledges jobs.
- Phase 0 image `cms-api:ci` was verified at manifest digest `sha256:bb4bad86e72505c53496ff5e9a626c8a34542ab8137064f43bbef5ed8e43880d`; its published-port health smoke returned HTTP 200 and Docker Scout reported `0C / 0H / 0M / 0L` across 528 packages. The current Task 1–3 rebuild `cms-api:phase1a` hardens npm's bundled `undici` and `tar`; Docker Scout reports `0C / 0H / 0M / 0L` at digest `sha256:8344cf063ac4254e5ff99ae1c77fe1d7477bf8774781c85ead67cf52878ce0df`.
- `.github/workflows/backend-ci.yml` runs every canonical backend and contract gate.
- PostgreSQL 17 rehearsal applied all three migrations, repeated deploy with no pending migrations, reported status up to date, kept `cms_api` `NOLOGIN` with audit `SELECT/INSERT` only, and acquired the scheduler advisory lock.
- `apps/api/test/e2e/api.e2e-spec.ts` proves canonical envelopes and fail-closed OIDC/session behavior.
- OIDC hardening tests prove strict-environment HTTPS issuer enforcement, exact discovery-issuer matching and full 64-hex SHA-256 approval checksum validation.
- `apps/api/test/migrations/role-privileges.spec.ts` plus PostgreSQL 17 rehearsal prove `cms_api` is `NOLOGIN` and cannot update/delete `audit_events`.
- A PostgreSQL 17 runtime check created and revoked a session and read back `AUTH_LOGIN_SUCCESS` + `AUTH_LOGOUT` audit rows for the same actor.

Remaining external gates are intentionally not self-approved: DEC-001 requires Product/Security approval, DEC-002 requires IT Identity/Security approval and real issuer/audience/test account plus a mounted `OIDC_APPROVAL_RECORD_FILE`, and staging provider smoke is blocked until those inputs exist. `pnpm --filter @cms/api smoke:provider` fails closed when they are absent.
