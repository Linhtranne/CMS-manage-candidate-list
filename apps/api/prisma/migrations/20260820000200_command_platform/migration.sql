CREATE TABLE idempotency_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_key varchar(320) NOT NULL,
    request_hash varchar(128) NOT NULL,
    state varchar(32) NOT NULL DEFAULT 'IN_PROGRESS',
    status_code integer NOT NULL DEFAULT 200,
    response_json jsonb,
    expires_at timestamptz(6) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT idempotency_records_scope_key_key UNIQUE (scope_key),
    CONSTRAINT idempotency_records_state_check CHECK (state IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    CONSTRAINT idempotency_records_status_code_check CHECK (status_code BETWEEN 100 AND 599)
);
CREATE INDEX idempotency_records_expiry_idx ON idempotency_records (state, expires_at);

GRANT SELECT, INSERT, UPDATE ON outbox_events, job_attempts, idempotency_records TO cms_api;
REVOKE DELETE ON outbox_events, job_attempts, idempotency_records FROM cms_api;
