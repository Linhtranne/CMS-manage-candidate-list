# Database restore

1. Freeze command traffic and record the incident/correlation ID.
2. Restore the approved PITR target into an isolated database; never overwrite the primary first.
3. Run migration compatibility checks, checksum the restored schema and reconcile outbox/job rows.
4. Run authenticated candidate → application → journey smoke in the isolated target.
5. Promote only after Operations and Backend sign the RPO/RTO evidence; otherwise release the freeze and keep the feature disabled.
