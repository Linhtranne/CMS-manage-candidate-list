CREATE TABLE applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE RESTRICT,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    status varchar(40) NOT NULL DEFAULT 'MATCHED',
    source varchar(40) NOT NULL,
    requirement_snapshot jsonb NOT NULL,
    profile_snapshot jsonb NOT NULL,
    applied_at timestamptz(6) NOT NULL DEFAULT now(),
    last_activity_at timestamptz(6) NOT NULL DEFAULT now(),
    due_at timestamptz(6),
    decision_reason varchar(1000),
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT applications_status_check CHECK (status IN ('MATCHED', 'IN_INTERVIEW_PROCESS', 'ON_HOLD', 'PASSED', 'FAILED', 'WITHDRAWN')),
    CONSTRAINT applications_source_check CHECK (source IN ('MANUAL_MATCH', 'REFERRAL', 'IMPORT')),
    CONSTRAINT applications_version_positive CHECK (version > 0),
    CONSTRAINT applications_requirement_snapshot_object CHECK (jsonb_typeof(requirement_snapshot) = 'object'),
    CONSTRAINT applications_profile_snapshot_object CHECK (jsonb_typeof(profile_snapshot) = 'object')
);
CREATE UNIQUE INDEX applications_active_candidate_order_unique ON applications(candidate_id, job_order_id)
    WHERE status NOT IN ('PASSED', 'FAILED', 'WITHDRAWN');
CREATE INDEX applications_candidate_status_idx ON applications(candidate_id, status, created_at, id);
CREATE INDEX applications_order_status_idx ON applications(job_order_id, status, created_at, id);
CREATE INDEX applications_team_status_updated_idx ON applications(team_id, status, updated_at, id);

CREATE TABLE application_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    from_status varchar(40) NOT NULL,
    to_status varchar(40) NOT NULL,
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason varchar(1000),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX application_status_history_idx ON application_status_history(application_id, created_at, id);

GRANT SELECT, INSERT, UPDATE ON applications, application_status_history TO cms_api;
REVOKE DELETE ON applications, application_status_history FROM cms_api;
