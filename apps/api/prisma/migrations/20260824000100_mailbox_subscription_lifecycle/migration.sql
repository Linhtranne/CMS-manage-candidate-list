ALTER TABLE mailboxes
    ADD COLUMN provider_subscription_id varchar(500),
    ADD COLUMN provider_subscription_expires_at timestamptz(6),
    ADD COLUMN last_subscription_renewed_at timestamptz(6);

CREATE INDEX mailboxes_subscription_renewal_idx
    ON mailboxes (provider_subscription_expires_at, status, id)
    WHERE provider_subscription_id IS NOT NULL;

GRANT SELECT, UPDATE ON mailboxes TO cms_api;
REVOKE DELETE ON mailboxes FROM cms_api;
