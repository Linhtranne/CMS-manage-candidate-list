CREATE TABLE report_projection_watermarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_key varchar(160) NOT NULL UNIQUE,
    watermark_at timestamptz(6) NOT NULL,
    refreshed_at timestamptz(6) NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT report_projection_watermarks_version_positive CHECK (version > 0)
);

CREATE TABLE report_projection_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code varchar(80) NOT NULL,
    scope_key varchar(320) NOT NULL,
    dimension_key varchar(500) NOT NULL,
    as_of timestamptz(6) NOT NULL,
    payload jsonb NOT NULL,
    source_watermark timestamptz(6) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT report_projection_rows_payload_object_check CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT report_projection_rows_key UNIQUE (report_code, scope_key, dimension_key, as_of)
);
CREATE INDEX report_projection_rows_query_idx ON report_projection_rows (report_code, scope_key, as_of);

GRANT SELECT, INSERT, UPDATE ON report_projection_watermarks, report_projection_rows TO cms_api;
REVOKE DELETE ON report_projection_watermarks, report_projection_rows FROM cms_api;
