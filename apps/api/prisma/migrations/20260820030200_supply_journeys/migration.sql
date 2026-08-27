CREATE TABLE supply_journeys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    template_version_id uuid NOT NULL REFERENCES supply_journey_template_versions(id) ON DELETE RESTRICT,
    template_checksum varchar(71) NOT NULL,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    status varchar(32) NOT NULL DEFAULT 'ACTIVE',
    context_snapshot jsonb NOT NULL,
    started_at timestamptz(6) NOT NULL,
    completed_at timestamptz(6),
    cancel_reason varchar(1000),
    idempotency_key varchar(320) NOT NULL UNIQUE,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT supply_journeys_status_check CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT supply_journeys_version_positive CHECK (version > 0),
    CONSTRAINT supply_journeys_template_checksum_check CHECK (template_checksum ~ '^sha256:[0-9a-fA-F]{64}$'),
    CONSTRAINT supply_journeys_terminal_fields_check CHECK ((status = 'COMPLETED' AND completed_at IS NOT NULL) OR (status <> 'COMPLETED' AND completed_at IS NULL)),
    CONSTRAINT supply_journeys_cancel_reason_check CHECK ((status = 'CANCELLED' AND cancel_reason IS NOT NULL AND char_length(btrim(cancel_reason)) > 0) OR status <> 'CANCELLED')
);
CREATE UNIQUE INDEX supply_journeys_one_effective_per_candidate ON supply_journeys(candidate_id) WHERE status IN ('ACTIVE', 'ON_HOLD');
CREATE INDEX supply_journeys_owner_status_idx ON supply_journeys(owner_user_id, status, updated_at, id);
CREATE INDEX supply_journeys_team_status_idx ON supply_journeys(team_id, status, updated_at, id);

CREATE TABLE journey_milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id uuid NOT NULL REFERENCES supply_journeys(id) ON DELETE RESTRICT,
    template_milestone_id uuid,
    code varchar(80) NOT NULL,
    name varchar(240) NOT NULL,
    sequence integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'NOT_STARTED',
    dependency_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    due_at timestamptz(6),
    completed_at timestamptz(6),
    blocker_party varchar(32),
    blocker_reason varchar(1000),
    expected_resolution varchar(1000),
    waived_by uuid REFERENCES users(id) ON DELETE RESTRICT,
    waive_reason varchar(1000),
    waived_at timestamptz(6),
    not_applicable_reason varchar(1000),
    checklist_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence_requirement jsonb NOT NULL DEFAULT '[]'::jsonb,
    attempt_no integer NOT NULL DEFAULT 1,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT journey_milestones_journey_code_key UNIQUE (journey_id, code),
    CONSTRAINT journey_milestones_status_check CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'WAIVED', 'NOT_APPLICABLE')),
    CONSTRAINT journey_milestones_sequence_check CHECK (sequence > 0),
    CONSTRAINT journey_milestones_attempt_positive CHECK (attempt_no > 0),
    CONSTRAINT journey_milestones_version_positive CHECK (version > 0),
    CONSTRAINT journey_milestones_dependencies_check CHECK (jsonb_typeof(dependency_codes) = 'array'),
    CONSTRAINT journey_milestones_block_check CHECK ((status = 'BLOCKED' AND blocker_party IS NOT NULL AND blocker_reason IS NOT NULL) OR status <> 'BLOCKED'),
    CONSTRAINT journey_milestones_waive_check CHECK ((status = 'WAIVED' AND waive_reason IS NOT NULL AND waived_by IS NOT NULL AND waived_at IS NOT NULL) OR status <> 'WAIVED'),
    CONSTRAINT journey_milestones_na_check CHECK ((status = 'NOT_APPLICABLE' AND not_applicable_reason IS NOT NULL) OR status <> 'NOT_APPLICABLE')
);
CREATE INDEX journey_milestones_journey_sequence_idx ON journey_milestones(journey_id, sequence);
CREATE INDEX journey_milestones_owner_status_due_idx ON journey_milestones(owner_user_id, status, due_at, id);

CREATE TABLE journey_milestone_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id uuid NOT NULL REFERENCES supply_journeys(id) ON DELETE RESTRICT,
    milestone_id uuid REFERENCES journey_milestones(id) ON DELETE RESTRICT,
    from_status varchar(32),
    to_status varchar(32) NOT NULL,
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason varchar(1000),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX journey_milestone_history_journey_idx ON journey_milestone_history(journey_id, created_at, id);
CREATE INDEX journey_milestone_history_milestone_idx ON journey_milestone_history(milestone_id, created_at, id);

CREATE TABLE journey_milestone_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id uuid NOT NULL REFERENCES journey_milestones(id) ON DELETE RESTRICT,
    attempt_no integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'OPEN',
    reason varchar(1000) NOT NULL,
    opened_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at timestamptz(6) NOT NULL DEFAULT now(),
    closed_at timestamptz(6),
    result jsonb,
    CONSTRAINT journey_milestone_attempts_key UNIQUE (milestone_id, attempt_no),
    CONSTRAINT journey_milestone_attempts_status_check CHECK (status IN ('OPEN', 'SUPERSEDED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT journey_milestone_attempts_no_check CHECK (attempt_no > 0)
);
CREATE INDEX journey_milestone_attempts_status_idx ON journey_milestone_attempts(milestone_id, status, attempt_no);

CREATE OR REPLACE FUNCTION prevent_journey_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'journey history is append-only'; END; $$;
CREATE TRIGGER journey_milestone_history_append_only BEFORE UPDATE OR DELETE ON journey_milestone_history
FOR EACH ROW EXECUTE FUNCTION prevent_journey_history_mutation();

GRANT SELECT, INSERT, UPDATE ON supply_journeys, journey_milestones, journey_milestone_history, journey_milestone_attempts TO cms_api;
REVOKE DELETE ON supply_journeys, journey_milestones, journey_milestone_history, journey_milestone_attempts FROM cms_api;
