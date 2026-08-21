# Phase 1A production release runbook

This runbook promotes the Phase 1A candidate-recruitment release on a Docker Compose host. It is intentionally parameterized: production image digests, secrets, approvals and host values must come from the owning systems and must never be copied into this repository.

## Preconditions

Run from the release checkout on the deployment host or CI runner. Stop if any precondition is missing.

```sh
set -Eeuo pipefail
export NODE_ENV=production

: "${API_IMAGE:?API_IMAGE must be a registry image pinned by sha256 digest}"
: "${MIGRATION_IMAGE:?MIGRATION_IMAGE must be a builder/migration image pinned by sha256 digest}"
: "${WEB_IMAGE:?WEB_IMAGE must be a registry image pinned by sha256 digest}"
: "${POSTGRES_IMAGE:?POSTGRES_IMAGE must be pinned by sha256 digest}"
: "${REDIS_IMAGE:?REDIS_IMAGE must be pinned by sha256 digest}"
: "${APP_VERSION:?APP_VERSION must be the release version}"
: "${APP_ORIGIN:?APP_ORIGIN must be the public HTTPS origin}"
: "${CORS_ORIGINS:?CORS_ORIGINS must be the exact allowed origins}"
: "${DATABASE_URL:?DATABASE_URL must come from the secret manager}"
: "${REDIS_URL:?REDIS_URL must come from the secret manager}"
: "${ENCRYPTION_KEY:?ENCRYPTION_KEY must come from the secret manager}"
: "${SESSION_SECRET:?SESSION_SECRET must come from the secret manager}"
: "${RELEASE_APPROVALS_FILE:?RELEASE_APPROVALS_FILE must point to the immutable signed approval artifact}"
: "${IMAGE_DIGEST:?IMAGE_DIGEST must match API_IMAGE's sha256 digest}"
: "${MIGRATION_IMAGE_DIGEST:?MIGRATION_IMAGE_DIGEST must match MIGRATION_IMAGE's sha256 digest}"
: "${WEB_IMAGE_DIGEST:?WEB_IMAGE_DIGEST must match WEB_IMAGE's sha256 digest}"
: "${POSTGRES_IMAGE_DIGEST:?POSTGRES_IMAGE_DIGEST must match POSTGRES_IMAGE's sha256 digest}"
: "${REDIS_IMAGE_DIGEST:?REDIS_IMAGE_DIGEST must match REDIS_IMAGE's sha256 digest}"
RELEASE_SCOPE="${RELEASE_SCOPE:-phase-1a}"

case "$API_IMAGE" in *@sha256:*) ;; *) echo 'API_IMAGE must be digest-pinned' >&2; exit 1 ;; esac
case "$MIGRATION_IMAGE" in *@sha256:*) ;; *) echo 'MIGRATION_IMAGE must be digest-pinned' >&2; exit 1 ;; esac
case "$WEB_IMAGE" in *@sha256:*) ;; *) echo 'WEB_IMAGE must be digest-pinned' >&2; exit 1 ;; esac
test -r "$RELEASE_APPROVALS_FILE"
pnpm --filter @cms/api release:preflight
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile queue --profile migration config --quiet
```

The release manifest is generated only after the worktree is clean and the approval artifact contains approved DEC-001 through DEC-007 plus all required role signatures:

```sh
RELEASE_STATUS=production \
RELEASE_SCOPE="$RELEASE_SCOPE" \
RELEASE_APPROVED=true \
RELEASE_APPROVALS_FILE="$RELEASE_APPROVALS_FILE" \
IMAGE_DIGEST="$IMAGE_DIGEST" \
MIGRATION_IMAGE_DIGEST="$MIGRATION_IMAGE_DIGEST" \
WEB_IMAGE_DIGEST="$WEB_IMAGE_DIGEST" \
POSTGRES_IMAGE_DIGEST="$POSTGRES_IMAGE_DIGEST" \
REDIS_IMAGE_DIGEST="$REDIS_IMAGE_DIGEST" \
pnpm --filter @cms/api release:manifest
```

Do not set `RELEASE_APPROVED=true` as a bypass. The script independently rejects a dirty checkout, missing decisions, missing identities/timestamps and unapproved roles.

## Backup and migration

1. Record the database backup ID, backup completion time and restore target in the change ticket. Do not continue if backup health is unknown.
2. Pull/verify all digest-pinned images; do not build on the production host.
3. Apply forward-only migrations as a separate job, before starting the new API:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile migration run --rm migrate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile migration run --rm --entrypoint ./node_modules/.bin/prisma migrate migrate status
```

The migration job must exit zero twice and report no pending migrations. Never use `migrate reset`, a down migration or a destructive SQL command as rollback.

## Deploy and verify

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api web
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Replace the URL with the private ingress URL if the host is not local.
curl --fail --silent --show-error "$APP_ORIGIN/api/v1/health/live"
curl --fail --silent --show-error "$APP_ORIGIN/api/v1/health/ready"
```

Then run the authenticated staging/production smoke with a real provider session and synthetic test records. Verify at minimum: scoped candidate list/detail, application create/transition, interview schedule/complete, audit/outbox effects, and protected-route denial for an out-of-scope actor. Store request IDs, response status, image digest, migration head and redacted logs in the immutable release evidence.

Keep API canary observation active for at least the approved window. Watch 5xx rate, latency, database saturation, Redis memory/queue lag and audit/outbox failures. Do not enable OIDC, business catalog/template seeds, real candidate import or cross-border processing until the corresponding decision artifact is mounted and validated.

## Rollback

Rollback is an image/config change, not a database reset:

```sh
export API_IMAGE="$PREVIOUS_API_IMAGE"
export MIGRATION_IMAGE="$PREVIOUS_MIGRATION_IMAGE"
export WEB_IMAGE="$PREVIOUS_WEB_IMAGE"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api web
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl --fail --silent --show-error "$APP_ORIGIN/api/v1/health/live"
```

Rollback immediately for API unavailability, data-integrity symptoms, auth/scope failure, critical/high security findings or the approved performance/error threshold breach. Preserve the failed container logs and release manifest before replacement. If a migration is incompatible, stop traffic and use the prepared forward-fix; do not erase migration history.

## Evidence and escalation

Attach the production manifest, backup ID, migration output, health/readiness output, authenticated smoke output, observation metrics and rollback decision to the change record. Escalate to Backend, QA, Security, Operations and Product owners according to the decision register; an agent/developer cannot self-approve those gates.
