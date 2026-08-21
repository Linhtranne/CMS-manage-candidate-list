CREATE TABLE candidate_import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    file_name varchar(240) NOT NULL,
    checksum varchar(128) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'UPLOADED',
    mapping_version varchar(40) NOT NULL DEFAULT 'v1',
    preview_token_hash varchar(128),
    preview_expires_at timestamptz(6),
    total_rows integer NOT NULL DEFAULT 0,
    valid_rows integer NOT NULL DEFAULT 0,
    invalid_rows integer NOT NULL DEFAULT 0,
    duplicate_rows integer NOT NULL DEFAULT 0,
    created_candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidate_import_status_check CHECK (status IN ('UPLOADED', 'PARSED', 'MAPPED', 'PREVIEW_READY', 'COMMITTING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED')),
    CONSTRAINT candidate_import_rows_nonnegative CHECK (total_rows >= 0 AND valid_rows >= 0 AND invalid_rows >= 0 AND duplicate_rows >= 0),
    CONSTRAINT candidate_import_errors_array CHECK (jsonb_typeof(errors) = 'array'),
    CONSTRAINT candidate_import_created_ids_array CHECK (jsonb_typeof(created_candidate_ids) = 'array'),
    CONSTRAINT candidate_import_version_positive CHECK (version > 0)
);
CREATE INDEX candidate_import_owner_created_idx ON candidate_import_batches(owner_id, created_at, id);
CREATE INDEX candidate_import_team_created_idx ON candidate_import_batches(team_id, created_at, id);

CREATE TABLE candidate_import_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    normalized_hash varchar(128) NOT NULL,
    idempotency_key varchar(240) NOT NULL UNIQUE,
    raw_json jsonb NOT NULL,
    state varchar(32) NOT NULL DEFAULT 'PENDING',
    error_code varchar(120),
    candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidate_import_row_number_positive CHECK (row_number > 0),
    CONSTRAINT candidate_import_row_state_check CHECK (state IN ('PENDING', 'VALID', 'DUPLICATE', 'REVIEW', 'CREATED', 'ERROR')),
    CONSTRAINT candidate_import_row_unique UNIQUE (batch_id, row_number)
);
CREATE INDEX candidate_import_rows_batch_state_idx ON candidate_import_rows(batch_id, state, row_number);

CREATE TABLE candidate_duplicate_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    target_candidate_id uuid REFERENCES candidates(id) ON DELETE RESTRICT,
    kind varchar(32) NOT NULL,
    state varchar(32) NOT NULL DEFAULT 'OPEN',
    signals jsonb NOT NULL DEFAULT '{}'::jsonb,
    resolution_reason varchar(1000),
    resolved_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
    resolved_at timestamptz(6),
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidate_duplicate_kind_check CHECK (kind IN ('PASSPORT', 'EMAIL', 'PHONE', 'FUZZY', 'IMPORT_REVIEW')),
    CONSTRAINT candidate_duplicate_state_check CHECK (state IN ('OPEN', 'REVIEWED', 'KEEP_SEPARATE', 'MERGED', 'REJECTED')),
    CONSTRAINT candidate_duplicate_version_positive CHECK (version > 0)
);
CREATE INDEX candidate_duplicate_source_state_idx ON candidate_duplicate_cases(source_candidate_id, state, created_at);
CREATE INDEX candidate_duplicate_target_state_idx ON candidate_duplicate_cases(target_candidate_id, state, created_at);

CREATE TABLE candidate_merge_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    loser_candidate_id uuid NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE RESTRICT,
    reason varchar(1000) NOT NULL,
    merged_by_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    merged_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidate_merge_distinct CHECK (winner_candidate_id <> loser_candidate_id)
);
CREATE INDEX candidate_merge_winner_idx ON candidate_merge_aliases(winner_candidate_id, merged_at);

GRANT SELECT, INSERT, UPDATE ON candidate_import_batches, candidate_import_rows, candidate_duplicate_cases, candidate_merge_aliases TO cms_api;
REVOKE DELETE ON candidate_import_batches, candidate_import_rows, candidate_duplicate_cases, candidate_merge_aliases FROM cms_api;
