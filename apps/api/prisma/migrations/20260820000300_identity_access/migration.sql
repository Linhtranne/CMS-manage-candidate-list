CREATE TABLE oidc_login_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state_hash varchar(128) NOT NULL,
    expires_at timestamptz(6) NOT NULL,
    used_at timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT oidc_login_states_state_hash_key UNIQUE (state_hash)
);
CREATE INDEX oidc_login_states_expiry_idx ON oidc_login_states (expires_at, used_at);

GRANT SELECT, INSERT, UPDATE ON oidc_login_states TO cms_api;
REVOKE DELETE ON oidc_login_states FROM cms_api;
