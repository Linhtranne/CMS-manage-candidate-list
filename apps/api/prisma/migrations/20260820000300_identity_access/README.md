# Identity access migration

Migration `20260820000300_identity_access` adds the durable OIDC login-state table used to consume an authorization-code `state` exactly once.

## Deploy contract

- Run `pnpm --filter @cms/api db:migrate:deploy` as a release step before starting API/worker/scheduler; API boot never runs migrations.
- The migration is additive: it creates `oidc_login_states`, a unique SHA-256 state hash, expiry/used timestamps, and the replay/expiry index.
- Do not store the raw OIDC state, authorization code, access token, refresh token, or client secret in PostgreSQL.

## Verification

- Apply migrations to an empty PostgreSQL 17 database and run the deploy command a second time; Prisma must report no pending migrations.
- Verify `oidc_login_states_state_hash_key` and `oidc_login_states_expiry_idx` with database introspection.
- Exercise `OidcAdapter.start()` and `complete()` with the security suite; a used or expired state must return `OIDC_STATE_REPLAYED` or `OIDC_STATE_EXPIRED`.

## Rollback / forward fix

There is no destructive down migration. Preserve the applied migration record and ship a forward-only corrective migration after diagnosis. If the table is unavailable, OIDC callback must fail closed rather than accepting an in-memory or untracked state in staging/production.
