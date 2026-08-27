import { describe, expect, it } from 'vitest';
import {
  evaluateApplicability,
  validateApplicabilityExpression,
  type ApplicabilityExpression,
} from '../../src/modules/supply-journeys/domain/applicability-expression.js';
import {
  selectApplicableTemplate,
  validateJourneyTemplateDefinition,
  type JourneyTemplateVersionEntity,
} from '../../src/modules/supply-journeys/domain/journey-template.js';
import { JourneyTemplateService, type JourneyTemplateRepository } from '../../src/modules/supply-journeys/application/journey-template.service.js';

const context = {
  residenceContext: 'OUTSIDE_JAPAN' as const,
  visaRouteVersionId: 'visa-engineer-v3',
  caseType: 'NEW_ENTRY' as const,
  sectorVersionId: 'sector-it-v2',
  occupationVersionId: 'occupation-swe-v4',
};

function template(overrides: Partial<JourneyTemplateVersionEntity> = {}): JourneyTemplateVersionEntity {
  return {
    id: overrides.id ?? 'version-1',
    templateId: overrides.templateId ?? 'template-1',
    code: overrides.code ?? 'OUTSIDE-ENGINEER',
    name: overrides.name ?? 'Ngoài Nhật - Kỹ sư',
    version: overrides.version ?? 1,
    status: overrides.status ?? 'ACTIVE',
    residenceContext: overrides.residenceContext ?? 'OUTSIDE_JAPAN',
    visaRouteVersionId: overrides.visaRouteVersionId === undefined ? 'visa-engineer-v3' : overrides.visaRouteVersionId,
    caseType: overrides.caseType ?? 'NEW_ENTRY',
    sectorVersionId: overrides.sectorVersionId === undefined ? null : overrides.sectorVersionId,
    occupationVersionId: overrides.occupationVersionId === undefined ? null : overrides.occupationVersionId,
    applicability: overrides.applicability ?? null,
    milestones: overrides.milestones ?? [{
      code: 'ACCEPTANCE',
      name: 'Xác nhận nhận việc',
      sequence: 1,
      parallel: false,
      dependencyCodes: [],
      ownerRule: { role: 'JAPAN_COORDINATOR' },
      checklistSchema: { type: 'object', properties: {}, additionalProperties: false },
      evidenceRequirements: [],
    }],
    checksum: overrides.checksum ?? 'sha256:' + 'a'.repeat(64),
    effectiveFrom: overrides.effectiveFrom ?? null,
    effectiveTo: overrides.effectiveTo ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-08-20T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-08-20T00:00:00Z'),
  };
}

describe('applicability compiler', () => {
  it('supports only eq/in/and/or/exists over immutable context', () => {
    const expression: ApplicabilityExpression = {
      and: [
        { eq: ['residenceContext', 'OUTSIDE_JAPAN'] },
        { in: ['caseType', ['NEW_ENTRY', 'STATUS_CHANGE']] },
        { exists: 'occupationVersionId' },
      ],
    };
    expect(validateApplicabilityExpression(expression)).toBeUndefined();
    expect(evaluateApplicability(expression, context)).toBe(true);
    expect(() => validateApplicabilityExpression({ script: 'return true' } as never)).toThrow(/EXPRESSION/);
    expect(() => validateApplicabilityExpression({ eq: ['$ref', 'https://example.test'] } as never)).toThrow(/EXPRESSION/);
  });

  it('rejects malformed or deeply nested expressions', () => {
    expect(() => validateApplicabilityExpression({ eq: ['unknownPath', 'x'] } as never)).toThrow(/EXPRESSION/);
    expect(() => validateApplicabilityExpression({ and: [] } as never)).toThrow(/EXPRESSION/);
    expect(() => validateApplicabilityExpression({ or: [{ eq: ['residenceContext', 'OUTSIDE_JAPAN'] }] } as never)).not.toThrow();
  });
});

describe('journey template applicability and activation validation', () => {
  it('selects occupation, then sector, then visa/case, then global specificity', () => {
    const occupation = template({ id: 'occupation', occupationVersionId: context.occupationVersionId, sectorVersionId: context.sectorVersionId });
    const sector = template({ id: 'sector', occupationVersionId: null, sectorVersionId: context.sectorVersionId });
    const base = template({ id: 'base', occupationVersionId: null, sectorVersionId: null });
    const global = template({ id: 'global', visaRouteVersionId: null, occupationVersionId: null, sectorVersionId: null });

    expect(selectApplicableTemplate([global, base, sector, occupation], context).id).toBe('occupation');
    expect(selectApplicableTemplate([global, base, sector], { ...context, occupationVersionId: 'occupation-other' }).id).toBe('sector');
    expect(selectApplicableTemplate([global, base], { ...context, sectorVersionId: 'sector-other', occupationVersionId: 'occupation-other' }).id).toBe('base');
    expect(selectApplicableTemplate([global], { ...context, visaRouteVersionId: 'visa-other', sectorVersionId: 'sector-other', occupationVersionId: 'occupation-other' }).id).toBe('global');
  });

  it('fails closed for ambiguity and no match', () => {
    expect(() => selectApplicableTemplate([template({ id: 'one' }), template({ id: 'two' })], context)).toThrow(/AMBIGUOUS/);
    expect(() => selectApplicableTemplate([template({ residenceContext: 'IN_JAPAN', id: 'japan' })], context)).toThrow(/NOT_APPLICABLE/);
  });

  it('requires an acyclic milestone graph and safe JSON schema subset', () => {
    expect(() => validateJourneyTemplateDefinition(template({ milestones: [
      { code: 'AA', name: 'Milestone A', sequence: 1, parallel: false, dependencyCodes: ['BB'], ownerRule: {}, checklistSchema: { type: 'object', properties: {} }, evidenceRequirements: [] },
      { code: 'BB', name: 'Milestone B', sequence: 2, parallel: false, dependencyCodes: ['AA'], ownerRule: {}, checklistSchema: { type: 'object', properties: {} }, evidenceRequirements: [] },
    ] }))).toThrow(/CYCLE/);
    expect(() => validateJourneyTemplateDefinition(template({ milestones: [
      { code: 'AA', name: 'Milestone A', sequence: 1, parallel: false, dependencyCodes: [], ownerRule: {}, checklistSchema: { $ref: 'https://remote/schema' }, evidenceRequirements: [] },
    ] }))).toThrow(/SCHEMA/);
    expect(validateJourneyTemplateDefinition(template())).toBeUndefined();
  });
});

class InMemoryJourneyTemplateRepository implements JourneyTemplateRepository {
  private sequence = 0;
  private readonly templates = new Map<string, { id: string; code: string; name: string }>();
  private readonly versions = new Map<string, JourneyTemplateVersionEntity>();

  async withTransaction<T>(work: (repository: JourneyTemplateRepository, transaction: unknown) => Promise<T>): Promise<T> {
    return work(this, { kind: 'test-transaction' });
  }
  async findTemplate(code: string) { return [...this.templates.values()].find((template) => template.code === code) ?? null; }
  async createTemplate(code: string, name: string) {
    const template = { id: `template-${++this.sequence}`, code, name };
    this.templates.set(template.id, template);
    return template;
  }
  async findVersion(id: string) { return this.versions.get(id) ?? null; }
  async createVersion(input: Omit<JourneyTemplateVersionEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const version = { ...input, id: `version-${++this.sequence}`, createdAt: now, updatedAt: now };
    this.versions.set(version.id, version);
    return version;
  }
  async updateStatus(id: string, status: JourneyTemplateVersionEntity['status']) {
    const current = this.versions.get(id)!;
    const updated = { ...current, status, updatedAt: new Date() };
    this.versions.set(id, updated);
    return updated;
  }
  async listVersions(status?: JourneyTemplateVersionEntity['status']) {
    return [...this.versions.values()].filter((version) => !status || version.status === status);
  }
}

describe('journey template service', () => {
  it('keeps drafts inactive and gates activation on matching DEC-004 checksum', async () => {
    const repo = new InMemoryJourneyTemplateRepository();
    const audit: string[] = [];
    const outbox: string[] = [];
    const service = new JourneyTemplateService(repo, {
      audit: async (transaction, input) => { expect(transaction).toMatchObject({ kind: 'test-transaction' }); audit.push(input.action); },
      outbox: async (transaction, input) => { expect(transaction).toMatchObject({ kind: 'test-transaction' }); outbox.push(input.eventType); },
    });
    const draftInput = {
      code: 'OUTSIDE-ENGINEER', name: 'Ngoài Nhật - Kỹ sư', version: 1,
      residenceContext: 'OUTSIDE_JAPAN' as const, visaRouteVersionId: 'visa-engineer-v3', caseType: 'NEW_ENTRY' as const,
      milestones: template().milestones,
    };
    const draft = await service.createDraft(draftInput, { actorId: 'u-1', requestId: 'r-1', correlationId: 'c-1' });
    expect(draft.status).toBe('DRAFT');
    await expect(service.activate(draft.id, 1, { actorId: 'u-1', requestId: 'r-2', correlationId: 'c-2', approval: { decisionId: 'DEC-004', artifactChecksum: 'sha256:' + 'b'.repeat(64), scope: 'test' } })).rejects.toMatchObject({ code: 'TEMPLATE_CHECKSUM_MISMATCH' });
    const active = await service.activate(draft.id, 1, { actorId: 'u-1', requestId: 'r-3', correlationId: 'c-3', approval: { decisionId: 'DEC-004', artifactChecksum: draft.checksum, scope: 'test' } });
    expect(active.status).toBe('ACTIVE');
    expect(audit).toEqual(['JOURNEY_TEMPLATE_VERSION_CREATED', 'JOURNEY_TEMPLATE_VERSION_ACTIVATED']);
    expect(outbox).toEqual(['journey.template.version.created', 'journey.template.version.activated']);
  });
});
