# Task and rule version migration

Risk: high. This migration introduces versioned, code-owned task rules and a scoped task aggregate. Rule replay is deduplicated by `dedupe_key`; task completion never mutates a source aggregate.

Verify the status checks, active rule uniqueness, terminal-task trigger, rule-task due/dedupe constraints and application-role grants before enabling any rule seed.

Rollback is forward-only after tasks are created. Retire rules/tasks; do not drop task history or grant application-role deletes.
