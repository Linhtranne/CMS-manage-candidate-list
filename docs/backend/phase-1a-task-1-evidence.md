---
title: Phase 1A Task 1 catalog and template evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 1 evidence

## Scope

Task 1 delivers the versioned catalog foundation and the interview-question snapshot validator. Production activation remains fail-closed until the server-owned DEC-004 artifact is approved, mounted, checksum-valid, scoped to the runtime environment, and signed by Product Owner plus Japan Operations Owner.

## Implementation

- `CatalogItem` and `CatalogVersion` use stable `(type, code)` identity and unique `(item_id, version)` versions.
- State transitions are exactly `DRAFT -> ACTIVE -> RETIRED`; optimistic version checks run inside the database transaction.
- Active versions are protected by PostgreSQL partial unique indexes and immutability triggers. Application role `cms_api` has no delete privilege on catalog/template tables.
- Every create/activate/retire mutation appends audit and outbox records through the same transaction callback.
- Activation and retirement never trust client-provided approval. The controller reads a server-owned `CATALOG_APPROVAL_RECORD_FILE`; missing, malformed, unapproved, out-of-scope, or placeholder records produce `DECISION_REQUIRED`.
- Question snapshots require non-empty Vietnamese text, unique keys/orders, and a scoring rule; the normalized snapshot is sorted by order.

## Verification

```text
pnpm --filter @cms/api test                 # 22 files, 58 passed, 4 skipped
pnpm --filter @cms/api lint                 # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                # passed
pnpm --filter @cms/api typecheck            # passed
pnpm --filter @cms/api exec vitest run test/catalog test/migrations/catalog.migration-spec.ts
                                             # 5 files, 12 passed
pnpm --filter @cms/contracts generate       # passed
pnpm --filter @cms/contracts test           # 7 passed
pnpm docs:validate                          # BROKEN_LINKS=0, BACKEND_PLACEHOLDERS=0
```

Disposable PostgreSQL 17 rehearsal applied all four migrations, reported `Database schema is up to date`, exposed all four catalog/template tables, and verified `has_table_privilege('cms_api','catalog_versions','DELETE') = false`.

## Remaining approval boundary

No DEC-004 business artifact was fabricated or self-approved. This task is technically ready for Backend Tech Lead/Product/Operations review; production business seed activation is still blocked by the external DEC-004 approval.
