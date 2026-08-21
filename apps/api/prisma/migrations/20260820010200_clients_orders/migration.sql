CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL UNIQUE,
    name varchar(240) NOT NULL,
    organization_type varchar(120) NOT NULL,
    industry_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
    region varchar(160) NOT NULL,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    status varchar(32) NOT NULL DEFAULT 'PROSPECT',
    notes varchar(2000),
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT clients_status_check CHECK (status IN ('PROSPECT', 'ACTIVE', 'PAUSED', 'INACTIVE')),
    CONSTRAINT clients_industry_labels_check CHECK (jsonb_typeof(industry_labels) = 'array' AND jsonb_array_length(industry_labels) > 0),
    CONSTRAINT clients_version_positive CHECK (version > 0)
);
CREATE INDEX clients_status_updated_idx ON clients(status, updated_at, id);
CREATE INDEX clients_team_status_updated_idx ON clients(team_id, status, updated_at, id);

CREATE TABLE client_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE RESTRICT,
    name varchar(160) NOT NULL,
    email varchar(320),
    phone varchar(40),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT client_contacts_name_check CHECK (char_length(btrim(name)) >= 2)
);

CREATE TABLE job_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL UNIQUE,
    position varchar(240) NOT NULL,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    industry_label varchar(160) NOT NULL,
    occupation varchar(160) NOT NULL,
    location varchar(160) NOT NULL,
    target integer NOT NULL,
    deadline timestamptz(6) NOT NULL,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    requirement_version integer NOT NULL DEFAULT 1,
    requirement_catalog_version_id uuid NOT NULL REFERENCES catalog_versions(id) ON DELETE RESTRICT,
    requirement_snapshot jsonb NOT NULL,
    active_applications integer NOT NULL DEFAULT 0,
    passed_applications integer NOT NULL DEFAULT 0,
    supplied_applications integer NOT NULL DEFAULT 0,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT job_orders_status_check CHECK (status IN ('DRAFT', 'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED', 'CLOSED')),
    CONSTRAINT job_orders_target_check CHECK (target > 0),
    CONSTRAINT job_orders_requirement_version_check CHECK (requirement_version > 0),
    CONSTRAINT job_orders_metrics_nonnegative CHECK (active_applications >= 0 AND passed_applications >= 0 AND supplied_applications >= 0),
    CONSTRAINT job_orders_version_positive CHECK (version > 0),
    CONSTRAINT job_orders_snapshot_object_check CHECK (jsonb_typeof(requirement_snapshot) = 'object')
);
CREATE INDEX job_orders_status_deadline_idx ON job_orders(status, deadline, id);
CREATE INDEX job_orders_client_status_deadline_idx ON job_orders(client_id, status, deadline, id);
CREATE INDEX job_orders_team_status_deadline_idx ON job_orders(team_id, status, deadline, id);

CREATE TABLE job_order_requirement_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE RESTRICT,
    version integer NOT NULL,
    catalog_version_id uuid NOT NULL REFERENCES catalog_versions(id) ON DELETE RESTRICT,
    snapshot jsonb NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT job_order_requirement_versions_unique UNIQUE (job_order_id, version),
    CONSTRAINT job_order_requirement_versions_version_positive CHECK (version > 0),
    CONSTRAINT job_order_requirement_versions_snapshot_object CHECK (jsonb_typeof(snapshot) = 'object')
);
CREATE INDEX job_order_requirement_versions_order_idx ON job_order_requirement_versions(job_order_id, created_at, id);

CREATE TABLE job_order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id uuid NOT NULL REFERENCES job_orders(id) ON DELETE RESTRICT,
    from_status varchar(32) NOT NULL,
    to_status varchar(32) NOT NULL,
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason varchar(1000),
    created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX job_order_status_history_order_idx ON job_order_status_history(job_order_id, created_at, id);

GRANT SELECT, INSERT, UPDATE ON clients, client_contacts, job_orders, job_order_requirement_versions, job_order_status_history TO cms_api;
REVOKE DELETE ON clients, client_contacts, job_orders, job_order_requirement_versions, job_order_status_history FROM cms_api;
