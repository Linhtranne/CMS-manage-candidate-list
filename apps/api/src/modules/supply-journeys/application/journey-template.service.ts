import {
  assertJourneyTemplateTransition,
  assertTemplateApprovalMatches,
  computeJourneyTemplateChecksum,
  JourneyTemplateDomainError,
  selectApplicableTemplate,
  validateJourneyTemplateDefinition,
  type JourneyContext,
  type JourneyTemplateApproval,
  type JourneyTemplateDraftInput,
  type JourneyTemplateStatus,
  type JourneyTemplateVersionEntity,
} from '../domain/journey-template.js';

export interface JourneyTemplateRepository {
  withTransaction<T>(work: (repository: JourneyTemplateRepository, transaction: unknown) => Promise<T>): Promise<T>;
  findTemplate(code: string): Promise<{ id: string; code: string; name: string } | null>;
  createTemplate(code: string, name: string): Promise<{ id: string; code: string; name: string }>;
  findVersion(id: string): Promise<JourneyTemplateVersionEntity | null>;
  createVersion(input: Omit<JourneyTemplateVersionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<JourneyTemplateVersionEntity>;
  updateStatus(id: string, status: JourneyTemplateStatus): Promise<JourneyTemplateVersionEntity>;
  listVersions(status?: JourneyTemplateStatus): Promise<JourneyTemplateVersionEntity[]>;
}

export interface JourneyTemplateCommandContext {
  actorId: string;
  requestId: string;
  correlationId: string;
  approval?: JourneyTemplateApproval;
}

export interface JourneyTemplateMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string }): Promise<void>;
}

function missingVersion(): never {
  throw new JourneyTemplateDomainError('JOURNEY_TEMPLATE_VERSION_NOT_FOUND', 'errors.journeyTemplateVersionNotFound', 404);
}

export class JourneyTemplateService {
  constructor(private readonly repository: JourneyTemplateRepository, private readonly effects?: JourneyTemplateMutationEffects) {}

  async createDraft(input: JourneyTemplateDraftInput, context: JourneyTemplateCommandContext): Promise<JourneyTemplateVersionEntity> {
    validateJourneyTemplateDefinition(input);
    const checksum = computeJourneyTemplateChecksum(input);
    return this.repository.withTransaction(async (repository, transaction) => {
      const template = input.templateId
        ? { id: input.templateId, code: input.code.trim().toUpperCase(), name: input.name.trim() }
        : await repository.findTemplate(input.code.trim().toUpperCase()) ?? await repository.createTemplate(input.code.trim().toUpperCase(), input.name.trim());
      const created = await repository.createVersion({
        templateId: template.id,
        code: template.code,
        name: template.name,
        version: input.version,
        status: 'DRAFT',
        residenceContext: input.residenceContext,
        visaRouteVersionId: input.visaRouteVersionId ?? null,
        caseType: input.caseType,
        sectorVersionId: input.sectorVersionId ?? null,
        occupationVersionId: input.occupationVersionId ?? null,
        applicability: input.applicability ?? null,
        milestones: input.milestones,
        checksum,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      });
      await this.recordEffects(transaction, context, created, 'JOURNEY_TEMPLATE_VERSION_CREATED', 'journey.template.version.created');
      return created;
    });
  }

  async activate(id: string, expectedVersion: number, context: JourneyTemplateCommandContext): Promise<JourneyTemplateVersionEntity> {
    return this.transition(id, expectedVersion, 'ACTIVE', context, 'JOURNEY_TEMPLATE_VERSION_ACTIVATED', 'journey.template.version.activated');
  }

  async retire(id: string, expectedVersion: number, context: JourneyTemplateCommandContext): Promise<JourneyTemplateVersionEntity> {
    return this.transition(id, expectedVersion, 'RETIRED', context, 'JOURNEY_TEMPLATE_VERSION_RETIRED', 'journey.template.version.retired');
  }

  async list(status?: JourneyTemplateStatus): Promise<JourneyTemplateVersionEntity[]> {
    return this.repository.listVersions(status);
  }

  async select(context: JourneyContext, at = new Date()): Promise<JourneyTemplateVersionEntity> {
    return selectApplicableTemplate(await this.repository.listVersions('ACTIVE'), context, at);
  }

  private async transition(id: string, expectedVersion: number, target: JourneyTemplateStatus, context: JourneyTemplateCommandContext, action: string, eventType: string): Promise<JourneyTemplateVersionEntity> {
    return this.repository.withTransaction(async (repository, transaction) => {
      const current = await repository.findVersion(id);
      if (!current) missingVersion();
      if (current.version !== expectedVersion) throw new JourneyTemplateDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      assertJourneyTemplateTransition(current.status, target);
      validateJourneyTemplateDefinition(current);
      if (target === 'ACTIVE' || target === 'RETIRED') assertTemplateApprovalMatches(current, context.approval);
      const updated = await repository.updateStatus(id, target);
      await this.recordEffects(transaction, context, updated, action, eventType);
      return updated;
    });
  }

  private async recordEffects(transaction: unknown, context: JourneyTemplateCommandContext, entity: JourneyTemplateVersionEntity, action: string, eventType: string): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: entity.id, actorUserId: context.actorId, correlationId: context.correlationId });
    await this.effects.outbox(transaction, { eventType, aggregateId: entity.id, correlationId: context.correlationId });
  }
}
