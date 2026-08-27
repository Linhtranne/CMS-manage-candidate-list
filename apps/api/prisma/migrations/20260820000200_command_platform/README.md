# Command platform migration

Migration `20260820000200_command_platform` adds durable HTTP idempotency records for command replay and conflict detection.

- Deploy with `pnpm --filter @cms/api db:migrate:deploy`; API processes never run migrations during boot.
- The migration is additive: no table or column is dropped. It adds a unique `scope_key`, request hash, state, expiry and canonical response JSON.
- Verify the unique idempotency key and expiry index, then run the deploy command a second time to confirm there are no pending migrations.
- Rollback is forward-only. If a release stops, preserve the migration record and ship a corrective migration after diagnosis.
