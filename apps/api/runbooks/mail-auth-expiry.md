# Mail auth expiry

1. Confirm mailbox health through `GET /api/v1/mailboxes/{id}/health`; response is masked and contains no credential material.
2. Keep the mailbox paused (`PAUSED_AUTH`) and verify the send worker refuses new sends. Do not rotate a secret in the database or logs.
3. Revoke the provider credential/subscription, rotate the external secret reference, then run the provider sandbox smoke with the approved DEC-003 record.
4. Resume only after the provider health check and canary reply/bounce checks pass. Record actor, approval, evidence IDs and timestamps in the incident/audit system.

If DEC-003 is missing/revoked, leave `MAIL_PROVIDER=DISABLED`; the application must fail closed.
