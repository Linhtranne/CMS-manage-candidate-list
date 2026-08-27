ALTER TABLE email_attachments
    ADD COLUMN provider_attachment_id varchar(500),
    ADD COLUMN detected_content_type varchar(160),
    ADD COLUMN scan_reason varchar(240),
    ADD COLUMN quarantined_at timestamptz(6),
    ADD COLUMN scanned_at timestamptz(6);

ALTER TABLE email_attachments ALTER COLUMN status SET DEFAULT 'DISCOVERED';
ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS email_attachments_status_check;
ALTER TABLE email_attachments ADD CONSTRAINT email_attachments_status_check CHECK (status IN ('DISCOVERED', 'DOWNLOADING', 'QUARANTINED', 'SCANNING', 'SAFE', 'REJECTED', 'FAILED'));
CREATE UNIQUE INDEX email_attachments_provider_unique_idx ON email_attachments(message_id, provider_attachment_id) WHERE provider_attachment_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON email_attachments TO cms_api;
REVOKE DELETE ON email_attachments FROM cms_api;
