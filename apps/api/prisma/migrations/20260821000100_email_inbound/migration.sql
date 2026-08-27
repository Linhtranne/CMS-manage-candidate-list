ALTER TABLE email_messages
    ADD COLUMN provider_thread_id varchar(500),
    ADD COLUMN in_reply_to varchar(998),
    ADD COLUMN references_json jsonb;

CREATE INDEX email_messages_thread_idx ON email_messages(mailbox_id, provider_thread_id, sent_or_received_at, id);
CREATE INDEX email_messages_reply_header_idx ON email_messages(mailbox_id, in_reply_to);

CREATE TABLE email_webhook_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider varchar(32) NOT NULL,
    mailbox_id uuid NOT NULL REFERENCES mailboxes(id) ON DELETE RESTRICT,
    notification_id varchar(500) NOT NULL,
    provider_message_id varchar(500) NOT NULL,
    expires_at timestamptz(6) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT email_webhook_notifications_provider_check CHECK (provider IN ('FAKE', 'MICROSOFT_GRAPH', 'GMAIL_API', 'SMTP_IMAP'))
);
CREATE UNIQUE INDEX email_webhook_notifications_dedupe_idx ON email_webhook_notifications(provider, mailbox_id, notification_id);
CREATE INDEX email_webhook_notifications_expiry_idx ON email_webhook_notifications(expires_at, created_at);

GRANT SELECT, INSERT, UPDATE ON email_webhook_notifications TO cms_api;
REVOKE DELETE ON email_webhook_notifications FROM cms_api;
