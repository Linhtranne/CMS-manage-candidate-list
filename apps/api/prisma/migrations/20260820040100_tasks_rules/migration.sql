CREATE TABLE task_rule_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(120) NOT NULL,
    version integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    event_type varchar(120) NOT NULL,
    action varchar(40) NOT NULL,
    title_template varchar(240) NOT NULL,
    due_after_hours integer,
    reference_entity_type varchar(80) NOT NULL,
    business_slot varchar(120) NOT NULL,
    conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT task_rule_versions_code_version_key UNIQUE (code, version),
    CONSTRAINT task_rule_versions_version_positive CHECK (version > 0),
    CONSTRAINT task_rule_versions_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    CONSTRAINT task_rule_versions_action_check CHECK (action IN ('CREATE', 'UPDATE_OPEN', 'CANCEL_OPEN', 'REQUEST_NOTIFICATION')),
    CONSTRAINT task_rule_versions_due_check CHECK (due_after_hours IS NULL OR due_after_hours BETWEEN 0 AND 8760),
    CONSTRAINT task_rule_versions_conditions_check CHECK (jsonb_typeof(conditions) = 'object')
);
CREATE INDEX task_rule_versions_event_status_idx ON task_rule_versions (event_type, status);
CREATE UNIQUE INDEX task_rule_versions_one_active_idx ON task_rule_versions (code) WHERE status = 'ACTIVE';

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(240) NOT NULL,
    description varchar(2000),
    status varchar(32) NOT NULL DEFAULT 'NEW',
    assignee_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    waiting_on varchar(32),
    due_at timestamptz(6),
    no_due_date_reason varchar(500),
    rule_code varchar(120),
    source_event_id uuid,
    dedupe_key varchar(320) UNIQUE,
    reference_entity_type varchar(80) NOT NULL,
    reference_entity_id varchar(120) NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT tasks_status_check CHECK (status IN ('NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
    CONSTRAINT tasks_waiting_on_check CHECK (waiting_on IS NULL OR waiting_on IN ('CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'OTHER')),
    CONSTRAINT tasks_version_positive CHECK (version > 0),
    CONSTRAINT tasks_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 240),
    CONSTRAINT tasks_rule_fields_check CHECK ((rule_code IS NULL AND source_event_id IS NULL AND dedupe_key IS NULL) OR (rule_code IS NOT NULL AND source_event_id IS NOT NULL AND dedupe_key IS NOT NULL AND due_at IS NOT NULL)),
    CONSTRAINT tasks_manual_due_check CHECK (rule_code IS NOT NULL OR due_at IS NOT NULL OR no_due_date_reason IS NOT NULL)
);
CREATE INDEX tasks_assignee_status_due_idx ON tasks (assignee_user_id, status, due_at, id);
CREATE INDEX tasks_team_status_due_idx ON tasks (team_id, status, due_at, id);
CREATE INDEX tasks_reference_status_idx ON tasks (reference_entity_type, reference_entity_id, status);

CREATE OR REPLACE FUNCTION prevent_task_rule_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'ACTIVE' AND NEW.status NOT IN ('ACTIVE', 'RETIRED') THEN
        RAISE EXCEPTION 'invalid task rule status transition';
    END IF;
    IF OLD.status = 'RETIRED' AND NEW.status <> 'RETIRED' THEN
        RAISE EXCEPTION 'retired task rules are immutable';
    END IF;
    IF OLD.status IN ('ACTIVE', 'RETIRED') AND (
        NEW.code IS DISTINCT FROM OLD.code OR NEW.version IS DISTINCT FROM OLD.version OR
        NEW.event_type IS DISTINCT FROM OLD.event_type OR NEW.action IS DISTINCT FROM OLD.action OR
        NEW.title_template IS DISTINCT FROM OLD.title_template OR NEW.due_after_hours IS DISTINCT FROM OLD.due_after_hours OR
        NEW.reference_entity_type IS DISTINCT FROM OLD.reference_entity_type OR NEW.business_slot IS DISTINCT FROM OLD.business_slot OR
        NEW.conditions IS DISTINCT FROM OLD.conditions
    ) THEN RAISE EXCEPTION 'active task rules are immutable'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER task_rule_versions_active_immutable BEFORE UPDATE ON task_rule_versions
FOR EACH ROW EXECUTE FUNCTION prevent_task_rule_mutation();

CREATE OR REPLACE FUNCTION prevent_task_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IN ('DONE', 'CANCELLED') AND (
        NEW.status IS DISTINCT FROM OLD.status OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR
        NEW.assignee_user_id IS DISTINCT FROM OLD.assignee_user_id OR NEW.team_id IS DISTINCT FROM OLD.team_id OR NEW.waiting_on IS DISTINCT FROM OLD.waiting_on OR
        NEW.due_at IS DISTINCT FROM OLD.due_at OR NEW.no_due_date_reason IS DISTINCT FROM OLD.no_due_date_reason OR NEW.rule_code IS DISTINCT FROM OLD.rule_code OR
        NEW.source_event_id IS DISTINCT FROM OLD.source_event_id OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key OR
        NEW.reference_entity_type IS DISTINCT FROM OLD.reference_entity_type OR NEW.reference_entity_id IS DISTINCT FROM OLD.reference_entity_id
    ) THEN RAISE EXCEPTION 'terminal tasks are immutable'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER tasks_terminal_immutable BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION prevent_task_mutation();

GRANT SELECT, INSERT, UPDATE ON task_rule_versions, tasks TO cms_api;
REVOKE DELETE ON task_rule_versions, tasks FROM cms_api;
