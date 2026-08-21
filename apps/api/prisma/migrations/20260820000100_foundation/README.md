# Foundation migration

Migration `20260820000100_foundation` creates the IAM/session baseline plus audit, transactional outbox, and job-attempt tables.

## Deploy contract

- Run `pnpm --filter @cms/api db:migrate:deploy` as a release step before starting API/worker/scheduler.
- `DATABASE_URL` is required by the wrapper and is never printed. Do not use `prisma db push` in any environment.
- The API bootstrap does not run migrations. This keeps startup safe when more than one process rolls out concurrently.
- The migration creates the `cms_api` `NOLOGIN` group role, grants schema/table access explicitly, and grants only `SELECT, INSERT` on `audit_events`; `UPDATE`/`DELETE` remain revoked. Deployment creates a separate login principal in the secret manager and grants it membership in `cms_api` (never commit a database password or put one in migration SQL).

## Pre-check and lock profile

Confirm the release database is backed up, reachable, and has the expected `pgcrypto` extension permission. The migration is additive and creates new tables/indexes; it does not drop tables or columns. Table creation takes short catalog locks, while index creation may hold a relation lock for the duration of the build. Run during a controlled deploy window and watch connection saturation.

## Verification

After deploy, run `pnpm --filter @cms/api db:migrate:status` and introspect `users`, `identity_links`, `sessions`, `audit_events`, `outbox_events`, and `job_attempts`. Verify `audit_events_append_only`, `outbox_events_pending_idx`, and `job_attempts_retry_idx` exist. Run the migration command a second time; Prisma must report the database is up to date.

For the integration gate, point `TEST_DATABASE_URL` at a disposable PostgreSQL database and run `pnpm --filter @cms/api test:migration`; the live hook is intentionally skipped when the variable is absent.

## Rollback / forward fix

There is no destructive down migration. If deployment stops, leave the applied migration recorded and ship a forward-only corrective migration after diagnosis. An N-1 application can continue because the change is additive and existing tables are not altered destructively.
