CREATE TABLE retention_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL,
    version integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    retention_days integer NOT NULL,
    applies_to jsonb NOT NULL,
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    UNIQUE(code, version),
    CONSTRAINT retention_policies_status_check CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
    CONSTRAINT retention_policies_days_check CHECK (retention_days >= 0)
);
CREATE TABLE legal_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type varchar(80) NOT NULL,
    entity_id varchar(120) NOT NULL,
    reason varchar(1000) NOT NULL,
    status varchar(24) NOT NULL DEFAULT 'ACTIVE',
    placed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    released_by uuid REFERENCES users(id) ON DELETE RESTRICT,
    released_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT legal_holds_status_check CHECK (status IN ('ACTIVE','RELEASED'))
);
CREATE INDEX legal_holds_entity_status_idx ON legal_holds(entity_type, entity_id, status);
REVOKE DELETE ON retention_policies, legal_holds FROM cms_api;
GRANT SELECT, INSERT, UPDATE ON retention_policies, legal_holds TO cms_api;
