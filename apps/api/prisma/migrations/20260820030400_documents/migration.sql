CREATE TABLE documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    title varchar(240) NOT NULL,
    category varchar(80) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'QUARANTINED',
    latest_version_no integer NOT NULL DEFAULT 1,
    legal_hold boolean NOT NULL DEFAULT false,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT documents_status_check CHECK (status IN ('QUARANTINED','SCANNING','SAFE','REJECTED','RETIRED','PURGED')),
    CONSTRAINT documents_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 240)
);
CREATE TABLE document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    version_no integer NOT NULL,
    object_key varchar(500) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum varchar(128) NOT NULL,
    claimed_mime varchar(120) NOT NULL,
    detected_mime varchar(120),
    status varchar(32) NOT NULL DEFAULT 'QUARANTINED',
    rejection_reason varchar(500),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT document_versions_status_check CHECK (status IN ('QUARANTINED','SCANNING','SAFE','REJECTED','RETIRED','PURGED')),
    CONSTRAINT document_versions_size_check CHECK (size_bytes > 0),
    UNIQUE(document_id, version_no)
);
CREATE TABLE document_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    journey_id uuid REFERENCES supply_journeys(id) ON DELETE RESTRICT,
    milestone_id uuid REFERENCES journey_milestones(id) ON DELETE RESTRICT,
    linked_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    UNIQUE(document_id, candidate_id, journey_id, milestone_id)
);
CREATE TABLE document_access_audits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    version_no integer NOT NULL,
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action varchar(40) NOT NULL,
    request_id varchar(120),
    created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX documents_candidate_status_idx ON documents(candidate_id, status, updated_at, id);
CREATE INDEX document_versions_document_status_idx ON document_versions(document_id, status, version_no);
CREATE INDEX documents_team_status_idx ON documents(team_id, status, updated_at, id);
CREATE INDEX document_links_candidate_journey_idx ON document_links(candidate_id, journey_id, milestone_id);
CREATE INDEX document_access_audits_document_created_idx ON document_access_audits(document_id, created_at, id);
REVOKE DELETE ON documents, document_versions, document_links, document_access_audits FROM cms_api;
GRANT SELECT, INSERT, UPDATE ON documents, document_versions, document_links, document_access_audits TO cms_api;
