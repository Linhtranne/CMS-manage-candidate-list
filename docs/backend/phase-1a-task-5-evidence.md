---
title: Phase 1A Task 5 application evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 5 evidence

## Delivered

- Application creation re-checks candidate/order state, owner/team scope, contactability and active-order eligibility inside one transaction.
- PostgreSQL partial uniqueness prevents two non-terminal attempts for the same candidate/order; concurrent creation maps the losing request to `ACTIVE_APPLICATION_EXISTS`.
- Requirement and candidate-profile snapshots are immutable application facts; status history, audit and outbox records are written in the same transaction.
- Transition validation covers the documented matrix, terminal states, required reasons/feedback and optimistic version conflicts.
- List/detail queries enforce scope and expose allowlisted views (`waiting-interview`, `interviewed`, `passed`, `failed`, `withdrawn`, `waiting-result`) with a stable `(updated_at,id)` cursor.

## Verification

```text
pnpm --filter @cms/api exec vitest run test/applications/application-concurrency.integration-spec.ts  # passed on PostgreSQL 17
pnpm --filter @cms/api test                                                                        # 36 files: 32 passed, 4 skipped; 82 passed, 15 skipped (97 total)
pnpm --filter @cms/api typecheck                                                                   # passed
pnpm --filter @cms/api lint                                                                        # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/contracts generate && pnpm --filter @cms/contracts test                       # generated; 7 tests passed
pnpm --filter @cms/api db:query-plan-smoke                                                   # scoped application plan uses applications_team_status_updated_idx
```

The disposable PostgreSQL rehearsal applied all nine migrations, verified the active-attempt partial index and `DELETE=false` privileges for `cms_api`, then ran the complete API suite against the migrated database.

## Approval boundary

The service is production-safe with synthetic data. Product/QA/Security/Operations approval and real identity/provider credentials remain release gates; no production application data is seeded.
