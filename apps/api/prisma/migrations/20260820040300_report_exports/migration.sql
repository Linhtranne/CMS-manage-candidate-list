CREATE TABLE report_export_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code varchar(80) NOT NULL,
    format varchar(16) NOT NULL,
    requester_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    purpose varchar(500) NOT NULL,
    scope_snapshot jsonb NOT NULL,
    included_fields jsonb NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'QUEUED',
    object_key varchar(500),
    expires_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT report_export_jobs_format_check CHECK (format IN ('CSV','XLSX')),
    CONSTRAINT report_export_jobs_status_check CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','EXPIRED')),
    CONSTRAINT report_export_jobs_purpose_check CHECK (char_length(btrim(purpose)) BETWEEN 1 AND 500)
);
CREATE INDEX report_export_jobs_requester_status_idx ON report_export_jobs(requester_id, status, created_at);
REVOKE DELETE ON report_export_jobs FROM cms_api;
GRANT SELECT, INSERT, UPDATE ON report_export_jobs TO cms_api;
