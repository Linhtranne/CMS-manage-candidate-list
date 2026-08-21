# Mail sync recovery

1. Pause the affected mailbox before replaying jobs if duplicate or unexpected volume is suspected.
2. Inspect the last committed cursor and provider change-feed health. Never edit a cursor forward by hand.
3. Request `POST /api/v1/mailboxes/{id}/sync` after queue health is restored. The worker advances the cursor only after every page item commits.
4. Reconcile duplicate webhook/poll notifications and inspect `UNMATCHED`/`AMBIGUOUS` inbox work. Do not auto-link a message during recovery.
5. Attach the queue/job IDs, cursor before/after and audit events to the incident record.
