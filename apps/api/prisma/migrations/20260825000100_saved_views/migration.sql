CREATE TABLE "saved_views" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "team_id" uuid,
    "resource" varchar(80) NOT NULL,
    "name" varchar(160) NOT NULL,
    "query" jsonb NOT NULL,
    "visibility" varchar(16) NOT NULL,
    "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saved_views_visibility_check" CHECK ("visibility" IN ('PRIVATE', 'TEAM')),
    CONSTRAINT "saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_views_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "saved_views_user_id_resource_name_key" ON "saved_views"("user_id", "resource", "name");
CREATE INDEX "saved_views_user_id_resource_visibility_idx" ON "saved_views"("user_id", "resource", "visibility");
CREATE INDEX "saved_views_team_id_resource_visibility_idx" ON "saved_views"("team_id", "resource", "visibility");
