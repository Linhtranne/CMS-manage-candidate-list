CREATE TABLE interviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    round_no integer NOT NULL,
    scheduled_at timestamptz(6) NOT NULL,
    scheduled_end_at timestamptz(6) NOT NULL,
    time_zone varchar(80) NOT NULL,
    mode varchar(32) NOT NULL,
    meeting_url varchar(1000),
    location varchar(240),
    schedule_status varchar(32) NOT NULL DEFAULT 'SCHEDULED',
    result varchar(32),
    feedback varchar(5000),
    strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
    concerns jsonb NOT NULL DEFAULT '[]'::jsonb,
    next_step varchar(1000),
    question_snapshot jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT interviews_round_positive CHECK (round_no > 0),
    CONSTRAINT interviews_schedule_range CHECK (scheduled_end_at > scheduled_at),
    CONSTRAINT interviews_mode_check CHECK (mode IN ('ONLINE', 'IN_PERSON')),
    CONSTRAINT interviews_status_check CHECK (schedule_status IN ('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT interviews_result_check CHECK (result IS NULL OR result IN ('PENDING', 'ADVANCE_NEXT_ROUND', 'PASS', 'FAIL')),
    CONSTRAINT interviews_strengths_array CHECK (jsonb_typeof(strengths) = 'array'),
    CONSTRAINT interviews_concerns_array CHECK (jsonb_typeof(concerns) = 'array'),
    CONSTRAINT interviews_question_snapshot_object CHECK (jsonb_typeof(question_snapshot) = 'object'),
    CONSTRAINT interviews_version_positive CHECK (version > 0),
    CONSTRAINT interviews_application_round_unique UNIQUE (application_id, round_no)
);
CREATE INDEX interviews_schedule_window_idx ON interviews(schedule_status, scheduled_at, scheduled_end_at);
CREATE INDEX interviews_application_schedule_idx ON interviews(application_id, scheduled_at, id);

CREATE TABLE interview_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT interview_participant_unique UNIQUE (interview_id, user_id)
);
CREATE INDEX interview_participants_user_idx ON interview_participants(user_id, interview_id);

CREATE TABLE interview_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action varchar(40) NOT NULL,
    from_status varchar(32),
    to_status varchar(32),
    previous_scheduled_at timestamptz(6),
    previous_scheduled_end_at timestamptz(6),
    reason varchar(1000),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX interview_history_idx ON interview_history(interview_id, created_at, id);

GRANT SELECT, INSERT, UPDATE ON interviews, interview_participants, interview_history TO cms_api;
REVOKE DELETE ON interviews, interview_participants, interview_history FROM cms_api;
