---
title: Phase 1A Task 3 candidate profiles evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 0.1.0
updated_at: 2026-08-21
owner: Backend Tech Lead
risk: high
---

# Phase 1A Task 3 evidence

## Implemented in this slice

- Candidate and CandidateOccupationProfile models plus migration `20260820010300_candidates`.
- Independent record/readiness/contactability statuses, exact normalized email/phone/passport duplicate gates, encrypted sensitive columns and HMAC blind indexes.
- Scope-bearing candidate list/detail queries, stable `(updated_at,id)` cursor, allowlisted filters, serializer masking and optimistic version conflict handling.
- `schemaVersionId` binds to an ACTIVE catalog version carrying an object JSON schema; required/properties/type/additionalProperties checks fail closed before profile persistence.
- Candidate create/update/archive and occupation-profile commands with audit/outbox effects; archive is fail-closed on reason and active-work checks.
- Canonical `/candidates`, `/candidates/{id}`, `/candidates/{id}/occupation-profiles` and `/candidates/{id}/archive` routes behind SessionGuard, PolicyGuard and CSRF for writes.

## Verification

```text
candidate domain + permission tests             # 9 passed on PostgreSQL-backed run
candidate migration contract                    # included in API suite
candidate persistence rehearsal                  # encrypted fields, blind index, duplicate passport, audit/outbox, archive passed
API full suite (no DB)                           # 31 files passed, 4 skipped
API full suite (PostgreSQL disposable)            # 35 files, 95 tests passed; nine migrations applied/up to date
API candidate + interview DB suite                # 2 files, 9 passed; schema binding and saved-view coverage included
cms-api:phase1a production rehearsal              # image ID/digest sha256:3dfbcbc5a334f0153fb029505d0a50846977453aed7e545b1f6eafad30826a1f; live/ready HTTP 200
pnpm --filter @cms/api typecheck                 # passed
pnpm --filter @cms/api lint                      # MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/contracts generate/test       # generated contract and 7 tests passed
pnpm docs:validate                               # BROKEN_LINKS=0, BACKEND_PLACEHOLDERS=0
```

## Remaining gates

- Fuzzy duplicate scoring/threshold is intentionally not implemented before Product approval; exact matching remains the only automatic gate.
- Candidate archive policy remains deny-by-default until the approval-request command path supplies a server-validated approval reference; no client-supplied approver is trusted.
- AC-28 UI-specific acceptance remains frontend-owned; backend provides the canonical contract and permission/query behavior. Full AC-31 role/scope matrix sign-off remains a reviewer gate.
- No production candidate data or fuzzy threshold is fabricated.
