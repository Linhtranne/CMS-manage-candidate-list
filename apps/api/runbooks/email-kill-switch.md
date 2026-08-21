# Email kill switch

1. Set the mailbox to `PAUSED_OPERATOR` using the audited admin command, or disable the queue/provider at the deployment layer for a global stop.
2. Confirm health, send and sync workers reject new work; already committed messages remain immutable evidence.
3. Preserve outbox/queue/job/audit IDs. Do not purge messages, attachments or provider references during an incident hold.
4. Resume only with an Operations/Security decision, a canary allowlist and a recorded reason. Re-run provider, reply, bounce and reconciliation smoke checks.
