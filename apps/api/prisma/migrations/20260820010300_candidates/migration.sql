CREATE TABLE candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL UNIQUE,
    name varchar(240) NOT NULL,
    normalized_name varchar(240) NOT NULL,
    industry_labels jsonb NOT NULL,
    occupation varchar(160) NOT NULL,
    japanese_level varchar(40) NOT NULL,
    email_ciphertext text,
    email_blind_index varchar(64),
    phone_ciphertext text,
    phone_blind_index varchar(64),
    address_ciphertext text,
    passport_ciphertext text,
    passport_blind_index varchar(64),
    source varchar(120) NOT NULL,
    record_status varchar(32) NOT NULL DEFAULT 'ACTIVE',
    readiness_status varchar(32) NOT NULL DEFAULT 'POTENTIAL',
    contactability_status varchar(40) NOT NULL DEFAULT 'CONTACTABLE',
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidates_industry_labels_check CHECK (jsonb_typeof(industry_labels) = 'array' AND jsonb_array_length(industry_labels) > 0),
    CONSTRAINT candidates_record_status_check CHECK (record_status IN ('ACTIVE', 'ARCHIVED')),
    CONSTRAINT candidates_readiness_status_check CHECK (readiness_status IN ('POTENTIAL', 'QUALIFIED', 'READY', 'PAUSED', 'NOT_SUITABLE')),
    CONSTRAINT candidates_contactability_status_check CHECK (contactability_status IN ('CONTACTABLE', 'TEMPORARILY_UNREACHABLE', 'DO_NOT_CONTACT')),
    CONSTRAINT candidates_version_positive CHECK (version > 0)
);
CREATE INDEX candidates_normalized_name_idx ON candidates(normalized_name);
CREATE INDEX candidates_email_blind_idx ON candidates(email_blind_index);
CREATE INDEX candidates_phone_blind_idx ON candidates(phone_blind_index);
CREATE UNIQUE INDEX candidates_passport_blind_unique ON candidates(passport_blind_index) WHERE passport_blind_index IS NOT NULL;
CREATE INDEX candidates_team_readiness_updated_idx ON candidates(team_id, readiness_status, updated_at, id);
CREATE INDEX candidates_owner_record_updated_idx ON candidates(owner_id, record_status, updated_at, id);

CREATE TABLE candidate_occupation_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    industry_label varchar(160) NOT NULL,
    occupation varchar(160) NOT NULL,
    years_experience double precision NOT NULL,
    skills jsonb NOT NULL DEFAULT '[]'::jsonb,
    desired_location varchar(160),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    schema_version_id varchar(120),
    status varchar(32) NOT NULL DEFAULT 'PRIMARY',
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT candidate_profiles_years_nonnegative CHECK (years_experience >= 0),
    CONSTRAINT candidate_profiles_skills_array CHECK (jsonb_typeof(skills) = 'array'),
    CONSTRAINT candidate_profiles_attributes_object CHECK (jsonb_typeof(attributes) = 'object'),
    CONSTRAINT candidate_profiles_status_check CHECK (status IN ('PRIMARY', 'SECONDARY', 'ARCHIVED')),
    CONSTRAINT candidate_profiles_unique UNIQUE (candidate_id, industry_label, occupation)
);
CREATE INDEX candidate_profiles_candidate_idx ON candidate_occupation_profiles(candidate_id, created_at, id);
CREATE INDEX candidate_profiles_occupation_idx ON candidate_occupation_profiles(occupation, status);

GRANT SELECT, INSERT, UPDATE ON candidates, candidate_occupation_profiles TO cms_api;
REVOKE DELETE ON candidates, candidate_occupation_profiles FROM cms_api;
