# Queue/outbox recovery

Stop duplicate consumers, inspect pending/failed outbox rows, and replay by immutable idempotency key. Reconcile task/document/report projection consumers before resuming. Do not manually mutate source aggregates from a queue console.
## Startup gate

`QUEUE_ENABLED=true` is permitted only when every queue listed in `QUEUE_NAMES`
has exactly one registered worker handler. Worker bootstrap fails closed with
`QUEUE_HANDLER_NOT_REGISTERED:<queue>` for a missing handler,
`QUEUE_HANDLER_DUPLICATE:<queue>` for duplicates, or
`QUEUE_HANDLER_NOT_ALLOWED:<queue>` for an unconfigured queue.

## Recovery sequence

1. Confirm Redis connectivity and the configured queue names.
2. Confirm worker logs show one handler per enabled queue before retrying jobs.
3. Pause new command traffic if a poison or provider outage is suspected.
4. Reconcile failed/outbox rows using the audited replay command; never edit queue payloads directly.
5. Re-run queue health, authenticated critical-path smoke, and the observation window before promotion.
