CREATE TABLE "entity_notes" (
  "id" UUID NOT NULL,
  "entity_type" VARCHAR(64) NOT NULL,
  "entity_id" UUID NOT NULL,
  "content" VARCHAR(5000) NOT NULL,
  "author_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entity_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "entity_notes_entity_type_entity_id_created_at_id_idx" ON "entity_notes"("entity_type", "entity_id", "created_at", "id");
CREATE INDEX "entity_notes_author_user_id_created_at_idx" ON "entity_notes"("author_user_id", "created_at");

ALTER TABLE "entity_notes" ADD CONSTRAINT "entity_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
