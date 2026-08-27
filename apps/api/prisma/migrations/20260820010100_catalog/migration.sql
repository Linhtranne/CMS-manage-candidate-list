CREATE TABLE catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type varchar(32) NOT NULL,
    code varchar(80) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT catalog_items_type_check CHECK (type IN ('INDUSTRY', 'OCCUPATION', 'VISA_ROUTE', 'SOURCE')),
    CONSTRAINT catalog_items_code_check CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]{1,79}$'),
    CONSTRAINT catalog_items_type_code_key UNIQUE (type, code)
);

CREATE TABLE catalog_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES catalog_items(id) ON DELETE RESTRICT,
    version integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    label_vi varchar(240) NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    usage_count integer NOT NULL DEFAULT 0,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT catalog_versions_item_version_key UNIQUE (item_id, version),
    CONSTRAINT catalog_versions_version_positive CHECK (version > 0),
    CONSTRAINT catalog_versions_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    CONSTRAINT catalog_versions_label_vi_check CHECK (char_length(btrim(label_vi)) BETWEEN 2 AND 240),
    CONSTRAINT catalog_versions_usage_count_nonnegative CHECK (usage_count >= 0)
);
CREATE INDEX catalog_versions_item_status_idx ON catalog_versions (item_id, status);
CREATE UNIQUE INDEX catalog_versions_one_active_idx ON catalog_versions (item_id) WHERE status = 'ACTIVE';

CREATE TABLE interview_question_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL UNIQUE,
    name varchar(160) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT interview_question_templates_code_check CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]{1,79}$')
);

CREATE TABLE interview_question_template_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES interview_question_templates(id) ON DELETE RESTRICT,
    version integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    questions jsonb NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT interview_question_template_versions_template_version_key UNIQUE (template_id, version),
    CONSTRAINT interview_question_template_versions_version_positive CHECK (version > 0),
    CONSTRAINT interview_question_template_versions_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    CONSTRAINT interview_question_template_versions_questions_array_check CHECK (jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) > 0)
);
CREATE INDEX interview_question_template_versions_template_status_idx ON interview_question_template_versions (template_id, status);
CREATE UNIQUE INDEX interview_question_template_versions_one_active_idx ON interview_question_template_versions (template_id) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION prevent_active_catalog_version_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'ACTIVE' AND (
        NEW.item_id IS DISTINCT FROM OLD.item_id OR
        NEW.version IS DISTINCT FROM OLD.version OR
        NEW.label_vi IS DISTINCT FROM OLD.label_vi OR
        NEW.payload IS DISTINCT FROM OLD.payload OR
        NEW.usage_count IS DISTINCT FROM OLD.usage_count
    ) THEN
        RAISE EXCEPTION 'active catalog versions are immutable';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER catalog_versions_active_immutable
BEFORE UPDATE ON catalog_versions
FOR EACH ROW EXECUTE FUNCTION prevent_active_catalog_version_mutation();

CREATE OR REPLACE FUNCTION prevent_active_question_template_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'ACTIVE' AND (
        NEW.template_id IS DISTINCT FROM OLD.template_id OR
        NEW.version IS DISTINCT FROM OLD.version OR
        NEW.questions IS DISTINCT FROM OLD.questions
    ) THEN
        RAISE EXCEPTION 'active interview question templates are immutable';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER interview_question_template_versions_active_immutable
BEFORE UPDATE ON interview_question_template_versions
FOR EACH ROW EXECUTE FUNCTION prevent_active_question_template_mutation();

GRANT SELECT, INSERT, UPDATE ON catalog_items, catalog_versions, interview_question_templates, interview_question_template_versions TO cms_api;
REVOKE DELETE ON catalog_items, catalog_versions, interview_question_templates, interview_question_template_versions FROM cms_api;
