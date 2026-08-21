CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL,
    name varchar(160) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX teams_code_key ON teams (code);

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name varchar(160) NOT NULL,
    email varchar(320) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'INVITED',
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX users_email_key ON users (email);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE INDEX users_team_id_idx ON users (team_id);

CREATE TABLE identity_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issuer varchar(500) NOT NULL,
    subject varchar(500) NOT NULL,
    email varchar(320),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT identity_links_issuer_subject_key UNIQUE (issuer, subject)
);
CREATE INDEX identity_links_user_id_idx ON identity_links (user_id);

CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL,
    description varchar(240),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX roles_code_key ON roles (code);

CREATE TABLE permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(120) NOT NULL,
    description varchar(240),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT permissions_code_key UNIQUE (code)
);

CREATE TABLE role_permissions (
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope varchar(32) NOT NULL DEFAULT 'TEAM',
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id, scope)
);
CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_hash varchar(128) NOT NULL,
    csrf_hash varchar(128) NOT NULL,
    expires_at timestamptz(6) NOT NULL,
    revoked_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    last_seen_at timestamptz(6) NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1,
    CONSTRAINT sessions_session_hash_key UNIQUE (session_hash)
);
CREATE INDEX sessions_user_expiry_idx ON sessions (user_id, expires_at);
CREATE INDEX sessions_active_idx ON sessions (expires_at, revoked_at) WHERE revoked_at IS NULL;

CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at timestamptz(6) NOT NULL DEFAULT now(),
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
    action varchar(120) NOT NULL,
    entity_type varchar(80) NOT NULL,
    entity_id varchar(120),
    correlation_id varchar(120) NOT NULL,
    diff_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_user_id, occurred_at);
CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, occurred_at);

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only';
END;
$$;
CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_api') THEN
        CREATE ROLE cms_api NOLOGIN;
    ELSE
        ALTER ROLE cms_api NOLOGIN;
    END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO cms_api;
REVOKE ALL ON audit_events FROM PUBLIC;
GRANT SELECT, INSERT ON audit_events TO cms_api;
REVOKE UPDATE, DELETE ON audit_events FROM cms_api;

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type varchar(120) NOT NULL,
    aggregate_type varchar(80) NOT NULL,
    aggregate_id varchar(120) NOT NULL,
    idempotency_key varchar(240) NOT NULL,
    schema_version integer NOT NULL DEFAULT 1,
    payload jsonb NOT NULL,
    state varchar(32) NOT NULL DEFAULT 'PENDING',
    available_at timestamptz(6) NOT NULL DEFAULT now(),
    attempts integer NOT NULL DEFAULT 0,
    locked_at timestamptz(6),
    published_at timestamptz(6),
    last_error varchar(1000),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT outbox_events_idempotency_key_key UNIQUE (idempotency_key),
    CONSTRAINT outbox_events_schema_version_positive CHECK (schema_version > 0),
    CONSTRAINT outbox_events_attempts_nonnegative CHECK (attempts >= 0),
    CONSTRAINT outbox_events_state_check CHECK (state IN ('PENDING', 'PROCESSING', 'COMPLETED', 'RETRY', 'DEAD'))
);
CREATE INDEX outbox_events_pending_idx ON outbox_events (state, available_at, created_at)
WHERE state IN ('PENDING', 'RETRY');

CREATE TABLE job_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_event_id uuid REFERENCES outbox_events(id) ON DELETE SET NULL,
    queue_name varchar(120) NOT NULL,
    job_key varchar(240) NOT NULL,
    state varchar(32) NOT NULL DEFAULT 'QUEUED',
    attempt integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    available_at timestamptz(6) NOT NULL DEFAULT now(),
    started_at timestamptz(6),
    finished_at timestamptz(6),
    last_error varchar(1000),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT job_attempts_attempt_bounds CHECK (attempt >= 0 AND max_attempts > 0 AND attempt <= max_attempts),
    CONSTRAINT job_attempts_state_check CHECK (state IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD'))
);
CREATE INDEX job_attempts_retry_idx ON job_attempts (state, available_at, created_at)
WHERE state IN ('QUEUED', 'FAILED');
CREATE INDEX job_attempts_outbox_idx ON job_attempts (outbox_event_id);

ALTER TABLE users ADD CONSTRAINT users_version_positive CHECK (version > 0);
ALTER TABLE teams ADD CONSTRAINT teams_version_positive CHECK (version > 0);
ALTER TABLE sessions ADD CONSTRAINT sessions_version_positive CHECK (version > 0);

GRANT SELECT, INSERT, UPDATE ON teams, users, identity_links, roles, permissions, role_permissions, user_roles,
    sessions TO cms_api;
REVOKE DELETE ON teams, users, identity_links, roles, permissions, role_permissions, user_roles,
    sessions FROM cms_api;
