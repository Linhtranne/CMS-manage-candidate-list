---
title: Phase 1A Task 4 import duplicate merge evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 4 evidence

## Delivered

- Candidate import batches accept 1–500 mapped JSON rows, persist a checksum, deterministic row idempotency keys, row-level states, masked previews and short-lived preview-token hashes.
- Commit is replay-safe: a completed batch returns its immutable summary without requiring a second token, while an incomplete batch still requires the original token and owner/team scope.
- Exact passport/email/phone matches create a duplicate review case; fuzzy matching is deliberately not enabled before Product approval.
- Duplicate review and merge preserve the winner ID, create a loser alias, move safe relationships transactionally, archive the loser and write audit/outbox records.
- Canonical routes are protected by session, policy and CSRF guards; cross-scope batch/case access is denied.

## Verification

```text
pnpm --filter @cms/api exec vitest run test/candidates/import-replay.integration-spec.ts  # passed on PostgreSQL 17
pnpm --filter @cms/api test                                                               # 36 files: 32 passed, 4 skipped; 82 passed, 15 skipped (97 total)
pnpm --filter @cms/api typecheck                                                          # passed
pnpm --filter @cms/api lint                                                               # MODULE_BOUNDARY_VIOLATIONS=0
```

The disposable PostgreSQL rehearsal applied all nine migrations, including `20260820010400_candidate_import_merge`, and `prisma migrate status` reported `Database schema is up to date`. The migration grants `SELECT/INSERT/UPDATE` to `cms_api` and revokes `DELETE` on import, duplicate and alias tables.

## Approval boundary

No fuzzy threshold, real candidate file, or production catalog mapping was fabricated. Production activation still requires the approved DEC-004 catalog/template artifact and the privacy/real-data gates outside this code change.
