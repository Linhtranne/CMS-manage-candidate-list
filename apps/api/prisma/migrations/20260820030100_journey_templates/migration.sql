CREATE TABLE supply_journey_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(80) NOT NULL,
    name varchar(160) NOT NULL,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT supply_journey_templates_code_key UNIQUE (code),
    CONSTRAINT supply_journey_templates_code_check CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]{1,79}$'),
    CONSTRAINT supply_journey_templates_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 160)
);

CREATE TABLE supply_journey_template_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES supply_journey_templates(id) ON DELETE RESTRICT,
    version integer NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    residence_context varchar(32) NOT NULL,
    visa_route_version_id uuid,
    case_type varchar(32) NOT NULL,
    sector_version_id uuid,
    occupation_version_id uuid,
    applicability jsonb,
    checksum varchar(71) NOT NULL,
    effective_from timestamptz(6),
    effective_to timestamptz(6),
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT supply_journey_template_versions_template_version_key UNIQUE (template_id, version),
    CONSTRAINT supply_journey_template_versions_version_positive CHECK (version > 0),
    CONSTRAINT supply_journey_template_versions_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    CONSTRAINT supply_journey_template_versions_residence_check CHECK (residence_context IN ('OUTSIDE_JAPAN', 'IN_JAPAN')),
    CONSTRAINT supply_journey_template_versions_case_check CHECK (case_type IN ('NEW_ENTRY', 'JOB_CHANGE', 'STATUS_CHANGE', 'OTHER')),
    CONSTRAINT supply_journey_template_versions_checksum_check CHECK (checksum ~ '^sha256:[0-9a-fA-F]{64}$'),
    CONSTRAINT supply_journey_template_versions_effective_window_check CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_from < effective_to),
    CONSTRAINT supply_journey_template_versions_applicability_check CHECK (applicability IS NULL OR jsonb_typeof(applicability) = 'object')
);
CREATE INDEX supply_journey_template_versions_scope_idx ON supply_journey_template_versions (residence_context, case_type, status);
CREATE INDEX supply_journey_template_versions_template_status_idx ON supply_journey_template_versions (template_id, status);
CREATE UNIQUE INDEX supply_journey_template_versions_one_active_idx ON supply_journey_template_versions (template_id) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION prevent_referenced_journey_template_identity_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW.code IS DISTINCT FROM OLD.code OR NEW.name IS DISTINCT FROM OLD.name)
       AND EXISTS (SELECT 1 FROM supply_journey_template_versions WHERE template_id = OLD.id AND status IN ('ACTIVE', 'RETIRED')) THEN
        RAISE EXCEPTION 'referenced journey template identity is immutable';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER supply_journey_templates_referenced_immutable
BEFORE UPDATE ON supply_journey_templates
FOR EACH ROW EXECUTE FUNCTION prevent_referenced_journey_template_identity_mutation();

CREATE TABLE journey_milestone_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_version_id uuid NOT NULL REFERENCES supply_journey_template_versions(id) ON DELETE RESTRICT,
    code varchar(80) NOT NULL,
    name varchar(240) NOT NULL,
    sequence integer NOT NULL,
    parallel boolean NOT NULL DEFAULT false,
    dependency_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
    applicability jsonb,
    due_sla_days integer,
    owner_rule jsonb NOT NULL,
    checklist_schema jsonb NOT NULL,
    evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now(),
    updated_at timestamptz(6) NOT NULL DEFAULT now(),
    CONSTRAINT journey_milestone_templates_version_code_key UNIQUE (template_version_id, code),
    CONSTRAINT journey_milestone_templates_version_sequence_key UNIQUE (template_version_id, sequence),
    CONSTRAINT journey_milestone_templates_code_check CHECK (code ~ '^[A-Z0-9][A-Z0-9._-]{1,79}$'),
    CONSTRAINT journey_milestone_templates_name_check CHECK (char_length(btrim(name)) BETWEEN 2 AND 240),
    CONSTRAINT journey_milestone_templates_sequence_check CHECK (sequence > 0),
    CONSTRAINT journey_milestone_templates_sla_check CHECK (due_sla_days IS NULL OR due_sla_days BETWEEN 0 AND 3650),
    CONSTRAINT journey_milestone_templates_dependencies_check CHECK (jsonb_typeof(dependency_codes) = 'array'),
    CONSTRAINT journey_milestone_templates_applicability_check CHECK (applicability IS NULL OR jsonb_typeof(applicability) = 'object'),
    CONSTRAINT journey_milestone_templates_owner_rule_check CHECK (jsonb_typeof(owner_rule) = 'object'),
    CONSTRAINT journey_milestone_templates_checklist_schema_check CHECK (jsonb_typeof(checklist_schema) = 'object'),
    CONSTRAINT journey_milestone_templates_evidence_check CHECK (jsonb_typeof(evidence_requirements) = 'array')
);
CREATE INDEX journey_milestone_templates_sequence_idx ON journey_milestone_templates (template_version_id, sequence);

CREATE OR REPLACE FUNCTION prevent_active_journey_template_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'ACTIVE') THEN
        RAISE EXCEPTION 'invalid journey template status transition';
    END IF;
    IF OLD.status = 'ACTIVE' AND NEW.status NOT IN ('ACTIVE', 'RETIRED') THEN
        RAISE EXCEPTION 'invalid journey template status transition';
    END IF;
    IF OLD.status = 'RETIRED' AND NEW.status <> 'RETIRED' THEN
        RAISE EXCEPTION 'retired journey template versions are immutable';
    END IF;
    IF OLD.status IN ('ACTIVE', 'RETIRED') AND (
        NEW.template_id IS DISTINCT FROM OLD.template_id OR
        NEW.version IS DISTINCT FROM OLD.version OR
        NEW.residence_context IS DISTINCT FROM OLD.residence_context OR
        NEW.visa_route_version_id IS DISTINCT FROM OLD.visa_route_version_id OR
        NEW.case_type IS DISTINCT FROM OLD.case_type OR
        NEW.sector_version_id IS DISTINCT FROM OLD.sector_version_id OR
        NEW.occupation_version_id IS DISTINCT FROM OLD.occupation_version_id OR
        NEW.applicability IS DISTINCT FROM OLD.applicability OR
        NEW.checksum IS DISTINCT FROM OLD.checksum OR
        NEW.effective_from IS DISTINCT FROM OLD.effective_from OR
        NEW.effective_to IS DISTINCT FROM OLD.effective_to
    ) THEN
        RAISE EXCEPTION 'active journey template versions are immutable';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER supply_journey_template_versions_active_immutable
BEFORE UPDATE ON supply_journey_template_versions
FOR EACH ROW EXECUTE FUNCTION prevent_active_journey_template_mutation();

CREATE OR REPLACE FUNCTION prevent_active_milestone_template_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM supply_journey_template_versions v
        WHERE v.id = OLD.template_version_id AND v.status IN ('ACTIVE', 'RETIRED')
    ) AND (
        NEW.template_version_id IS DISTINCT FROM OLD.template_version_id OR
        NEW.code IS DISTINCT FROM OLD.code OR
        NEW.name IS DISTINCT FROM OLD.name OR
        NEW.sequence IS DISTINCT FROM OLD.sequence OR
        NEW.parallel IS DISTINCT FROM OLD.parallel OR
        NEW.dependency_codes IS DISTINCT FROM OLD.dependency_codes OR
        NEW.applicability IS DISTINCT FROM OLD.applicability OR
        NEW.due_sla_days IS DISTINCT FROM OLD.due_sla_days OR
        NEW.owner_rule IS DISTINCT FROM OLD.owner_rule OR
        NEW.checklist_schema IS DISTINCT FROM OLD.checklist_schema OR
        NEW.evidence_requirements IS DISTINCT FROM OLD.evidence_requirements
    ) THEN
        RAISE EXCEPTION 'active journey milestone templates are immutable';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER journey_milestone_templates_active_immutable
BEFORE UPDATE ON journey_milestone_templates
FOR EACH ROW EXECUTE FUNCTION prevent_active_milestone_template_mutation();

GRANT SELECT, INSERT, UPDATE ON supply_journey_templates, supply_journey_template_versions, journey_milestone_templates TO cms_api;
REVOKE DELETE ON supply_journey_templates, supply_journey_template_versions, journey_milestone_templates FROM cms_api;
