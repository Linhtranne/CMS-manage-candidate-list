# Phase 1A rollback runbook

Use this when the canary or observation window shows a release-level failure. The rollback target must be a previously verified digest and compatible schema release.

## Trigger

Rollback for sustained API unavailability, critical data-integrity symptoms, authentication/scope regression, critical/high security findings, or an approved error/latency threshold breach. For a small isolated defect with healthy data and a safe forward fix, keep the current image and follow the change process instead.

## Procedure

1. Announce the incident and freeze unrelated changes.
2. Capture current container logs, release manifest, migration head and the first failing request IDs. Redact secrets and PII.
3. Confirm `PREVIOUS_API_IMAGE`, `PREVIOUS_MIGRATION_IMAGE` and `PREVIOUS_WEB_IMAGE` are immutable `@sha256:` references and that the previous release is compatible with the current schema.
4. Restore the previous application/web images with the production Compose override:

```sh
set -Eeuo pipefail
: "${PREVIOUS_API_IMAGE:?}"
: "${PREVIOUS_MIGRATION_IMAGE:?}"
: "${PREVIOUS_WEB_IMAGE:?}"
export API_IMAGE="$PREVIOUS_API_IMAGE"
export MIGRATION_IMAGE="$PREVIOUS_MIGRATION_IMAGE"
export WEB_IMAGE="$PREVIOUS_WEB_IMAGE"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api web
```

5. Verify `health/live`, `health/ready`, protected-route denial and one synthetic read-only critical flow. Check database connectivity, Redis health and outbox backlog.
6. Keep the old manifest and logs immutable. Open a forward-fix task for any schema incompatibility; never run `prisma migrate reset` or delete audit/outbox data.

## Exit criteria

The service is healthy, protected routes still fail closed, no new integrity errors appear during the observation window, and Backend/QA/Security/Operations record the rollback outcome and next action.
