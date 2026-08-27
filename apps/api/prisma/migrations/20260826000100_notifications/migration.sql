CREATE TABLE "notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "kind" varchar(64) NOT NULL,
    "severity" varchar(16) NOT NULL DEFAULT 'INFO',
    "params" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "href" varchar(500),
    "read_at" timestamptz(6),
    "dedupe_key" varchar(320) NOT NULL,
    "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_severity_check" CHECK ("severity" IN ('INFO', 'WARNING', 'DANGER')),
    CONSTRAINT "notifications_params_check" CHECK (jsonb_typeof("params") = 'object'),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_user_id_read_at_created_at_id_idx" ON "notifications"("user_id", "read_at", "created_at", "id");
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications"("user_id", "created_at", "id");

GRANT SELECT, INSERT, UPDATE ON notifications TO cms_api;
REVOKE DELETE ON notifications FROM cms_api;
