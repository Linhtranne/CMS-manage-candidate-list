---
title: Phase 1A Task 6 interview and saved views evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 6 evidence

## Delivered

- Interview scheduling enforces UTC start/end ordering, IANA timezone, active participants, active Application scope and participant overlap protection.
- `(application_id, round_no)` is unique; concurrent scheduling yields one round and a deterministic conflict response.
- Reschedule preserves the previous schedule, reason and actor in append-only history; cancel/no-show require a reason; completion requires feedback.
- Active interview question templates are snapshotted at schedule time and never changed by later template edits. No active template means `INTERVIEW_TEMPLATE_NOT_CONFIGURED` (fail-closed).
- Canonical saved-view query ports are available at `/views/waiting-interviews`, `/views/interviewed` and `/views/passed-applications`, plus the equivalent allowlisted `applications?view=` filters. All use scope-bearing queries and stable cursors.

## Verification

```text
pnpm --filter @cms/api exec vitest run test/interviews/interview.integration-spec.ts  # passed on PostgreSQL 17
pnpm --filter @cms/api test                                                            # 35 files, 95 tests passed
pnpm --filter @cms/api typecheck                                                       # passed
pnpm --filter @cms/api lint                                                            # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/contracts generate && pnpm --filter @cms/contracts test            # generated; 7 tests passed
pnpm --filter @cms/api db:query-plan-smoke                                             # overlap plan uses schedule/participant indexes
```

The disposable PostgreSQL rehearsal applied all nine migrations and verified interview status/result/range checks, round uniqueness, participant indexes and `DELETE=false` privileges for `cms_api`.

## Approval boundary

Interview template activation is still fail-closed until DEC-004 is approved and mounted. The integration evidence uses a clearly synthetic active template only inside the disposable test database.
