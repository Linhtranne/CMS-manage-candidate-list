---
title: Phase 1A Task 2 clients and job orders evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.1.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 2 evidence

## Delivered

- Client, ClientContact, JobOrder, requirement-version and append-only status-history models plus migration `20260820010200_clients_orders`.
- Client and JobOrder services with validation, explicit status transition matrix, optimistic version checks, requirement snapshots, audit/outbox effects, and CAS conflict mapping.
- Scope-bearing list queries retain owner/team filters even when a free-text query is present; sensitive contact email/phone are never returned by the HTTP serializer.
- Canonical `/clients`, `/clients/{id}`, `/orders`, `/orders/{id}`, `/orders/{id}/status` and `/orders/{id}/requirements` controllers with session, policy and CSRF gates.
- OpenAPI generated types updated for order requirement catalog version and requirement update endpoint.

## Local verification

```text
pnpm --filter @cms/api typecheck        # passed
pnpm --filter @cms/api lint            # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build           # passed
clients-orders domain/service/cursor tests # 7 passed using Vitest threads pool
clients-orders + migration tests       # 8 files, 18 tests passed on PostgreSQL 17
API full suite                            # 27 files, 69 passed, 4 skipped (no DB gate)
authenticated client-list E2E + EXPLAIN  # 2 passed on PostgreSQL 17
pnpm --filter @cms/web typecheck       # passed after contract regeneration
pnpm --filter @cms/contracts test      # 7 passed
pnpm docs:validate                     # BROKEN_LINKS=0, BACKEND_PLACEHOLDERS=0
```

## Runtime evidence

- Disposable PostgreSQL 17 applied all five migrations and reported `Database schema is up to date`.
- Live checks found all five Task 2 tables, the stable client/order indexes and constraints, and `cms_api` `SELECT/INSERT/UPDATE=true`, `DELETE=false` on `job_orders`.
- `cms-api:phase1a` rebuilt successfully; published-port `/api/v1/health/live` returned HTTP 200 with user `cms` and entrypoint `node dist/bootstrap/api.js`.
- Docker Scout image digest `sha256:69927f887c1a63f2aec6c71415af4eeafe55b1feb50e3ef8d61aec9ae364b352` reported `0C / 0H / 0M / 0L` across 528 packages.
- No production client/order seed is fabricated; all runtime fixtures are synthetic/disposable.
