CREATE TABLE mailboxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    address varchar(320) NOT NULL UNIQUE,
    display_name varchar(160) NOT NULL,
    provider varchar(32) NOT NULL DEFAULT 'DISABLED',
    status varchar(32) NOT NULL DEFAULT 'NOT_CONFIGURED',
    provider_account_ref varchar(240),
    sync_cursor text,
    sync_cursor_issued_at timestamptz(6),
    last_sync_at timestamptz(6),
    last_send_at timestamptz(6),
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT mailboxes_provider_check CHECK (provider IN ('DISABLED', 'FAKE', 'MICROSOFT_GRAPH', 'GMAIL_API', 'SMTP_IMAP')),
    CONSTRAINT mailboxes_status_check CHECK (status IN ('NOT_CONFIGURED', 'HEALTHY', 'DEGRADED', 'PAUSED_AUTH', 'PAUSED_OPERATOR', 'FAILED')),
    CONSTRAINT mailboxes_version_positive CHECK (version > 0)
);
CREATE INDEX mailboxes_status_sync_idx ON mailboxes(status, last_sync_at);

CREATE TABLE email_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE RESTRICT,
    candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
    application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
    journey_id uuid,
    subject varchar(998) NOT NULL,
    snippet varchar(500) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'NEEDS_ACTION',
    last_activity_at timestamptz(6) NOT NULL,
    message_count integer NOT NULL DEFAULT 0,
    has_unread_inbound boolean NOT NULL DEFAULT false,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_conversations_status_check CHECK (status IN ('NEEDS_ACTION', 'MATCHED', 'UNMATCHED', 'SENT', 'RECEIVED', 'CLOSED')),
    CONSTRAINT email_conversations_count_nonnegative CHECK (message_count >= 0),
    CONSTRAINT email_conversations_version_positive CHECK (version > 0)
);
CREATE INDEX email_conversations_mailbox_status_idx ON email_conversations(mailbox_id, status, last_activity_at, id);
CREATE INDEX email_conversations_candidate_activity_idx ON email_conversations(candidate_id, last_activity_at, id);
CREATE INDEX email_conversations_application_activity_idx ON email_conversations(application_id, last_activity_at, id);

CREATE TABLE email_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE RESTRICT,
    conversation_id uuid NOT NULL REFERENCES email_conversations(id) ON DELETE RESTRICT,
    direction varchar(16) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    provider_message_id varchar(500),
    internet_message_id varchar(998),
    idempotency_key varchar(240),
    from_address varchar(320) NOT NULL,
    subject varchar(998) NOT NULL,
    body_text text NOT NULL,
    sanitized_html text,
    sent_or_received_at timestamptz(6) NOT NULL,
    immutable boolean NOT NULL DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_messages_direction_check CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    CONSTRAINT email_messages_status_check CHECK (status IN ('DRAFT', 'QUEUED', 'SENDING', 'RETRY_WAIT', 'RECONCILING', 'SENT', 'RECEIVED', 'DELIVERED', 'BOUNCED', 'FAILED', 'CANCELLED')),
    CONSTRAINT email_messages_immutable_check CHECK (immutable = true),
    CONSTRAINT email_messages_version_positive CHECK (version > 0)
);
CREATE UNIQUE INDEX email_messages_provider_dedupe_idx ON email_messages(mailbox_id, provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX email_messages_idempotency_idx ON email_messages(mailbox_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX email_messages_conversation_time_idx ON email_messages(conversation_id, sent_or_received_at, id);
CREATE INDEX email_messages_status_time_idx ON email_messages(status, sent_or_received_at, id);

CREATE TABLE email_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE RESTRICT,
    kind varchar(8) NOT NULL,
    address varchar(320) NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_recipients_kind_check CHECK (kind IN ('TO', 'CC', 'BCC')),
    CONSTRAINT email_recipients_position_check CHECK (position >= 0),
    CONSTRAINT email_recipients_address_check CHECK (length(address) BETWEEN 3 AND 320)
);
CREATE UNIQUE INDEX email_recipients_unique_idx ON email_recipients(message_id, kind, address);
CREATE INDEX email_recipients_message_kind_idx ON email_recipients(message_id, kind, position);

CREATE TABLE email_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE RESTRICT,
    file_name varchar(240) NOT NULL,
    content_type varchar(160) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum varchar(128),
    object_key varchar(500) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'PENDING',
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_attachments_size_check CHECK (size_bytes >= 0),
    CONSTRAINT email_attachments_status_check CHECK (status IN ('PENDING', 'QUARANTINED', 'SCANNING', 'SAFE', 'REJECTED', 'FAILED'))
);
CREATE INDEX email_attachments_message_status_idx ON email_attachments(message_id, status);
CREATE INDEX email_attachments_status_created_idx ON email_attachments(status, created_at, id);

CREATE TABLE email_match_decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE RESTRICT,
    state varchar(32) NOT NULL DEFAULT 'PENDING',
    candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
    reason varchar(1000),
    resolved_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_match_decisions_state_check CHECK (state IN ('PENDING', 'MATCHED', 'AMBIGUOUS', 'UNMATCHED', 'RESOLVED'))
);
CREATE INDEX email_match_decisions_message_idx ON email_match_decisions(message_id, created_at, id);
CREATE INDEX email_match_decisions_state_idx ON email_match_decisions(state, created_at, id);

CREATE OR REPLACE FUNCTION prevent_sent_email_mutation() RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('SENT', 'RECEIVED') AND (
        NEW.from_address IS DISTINCT FROM OLD.from_address OR
        NEW.subject IS DISTINCT FROM OLD.subject OR
        NEW.body_text IS DISTINCT FROM OLD.body_text OR
        NEW.sanitized_html IS DISTINCT FROM OLD.sanitized_html
    ) THEN
        RAISE EXCEPTION 'EMAIL_MESSAGE_IMMUTABLE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER email_messages_immutable_trigger
    BEFORE UPDATE ON email_messages
    FOR EACH ROW EXECUTE FUNCTION prevent_sent_email_mutation();

GRANT SELECT, INSERT, UPDATE ON mailboxes, email_conversations, email_messages, email_recipients, email_attachments, email_match_decisions TO cms_api;
REVOKE DELETE ON mailboxes, email_conversations, email_messages, email_recipients, email_attachments, email_match_decisions FROM cms_api;
