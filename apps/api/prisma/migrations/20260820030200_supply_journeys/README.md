# Supply Journey start migration

Risk: high. This migration adds the Journey aggregate, immutable milestone snapshot/history and attempt storage.

Precheck: migrations `20260820010500_applications`, `20260820030100_journey_templates` and all foundation IAM tables must be applied.

Verify the candidate partial unique index, terminal/cancel constraints, milestone state checks, append-only history trigger and application-role no-delete grants.

Rollback is forward-only once a Journey exists. Retire/cancel records; do not drop journey history.
