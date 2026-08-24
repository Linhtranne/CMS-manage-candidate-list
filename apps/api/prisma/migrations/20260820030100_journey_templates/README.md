# Journey template version migration

Risk: high. This migration creates the versioned Journey Template and milestone-template contract used by all later Supply Journey work.

## Precheck

- Confirm `20260820010100_catalog` is applied.
- Confirm `cms_api` exists and can receive grants.
- Confirm no existing Journey runtime tables are being backfilled by this migration.

## Expected duration and lock risk

Fresh schema only; table creation is bounded. The active-version unique index and append-only triggers are created before the first activation. No production data rewrite is expected.

## Verify

- `supply_journey_template_versions_one_active_idx` exists.
- Active/retired rows reject content mutation and invalid status transitions.
- `cms_api` has SELECT/INSERT/UPDATE and no DELETE on the three new tables.
- Template applicability/milestone JSON columns are object/array constrained.

## Rollback / forward-fix

Do not drop these tables after a template has been referenced by a Journey. Use a forward-fix migration or retire the version; hard deletion is intentionally unavailable to `cms_api`.
