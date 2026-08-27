import { selectApplicableTemplate, type JourneyContext, type JourneyTemplateVersionEntity } from '../domain/journey-template.js';
import {
  assertJourneyStartApplication,
  assertTemplateContextBinding,
  buildMilestoneSnapshot,
  createPreviewToken,
  journeyContextFingerprint,
  SupplyJourneyDomainError,
  verifyPreviewToken,
  type ApplicationJourneyContext,
  type JourneyMilestoneSnapshot,
  type SupplyJourneyEntity,
} from '../domain/supply-journey.aggregate.js';
import { JourneyTemplateService } from './journey-template.service.js';

export interface JourneyScopeContext {
  actorId: string;
  teamId?: string;
  scope: 'SELF' | 'TEAM';
  requestId: string;
  correlationId: string;
}

export interface JourneyRepository {
  withTransaction<T>(work: (repository: JourneyRepository, transaction: unknown) => Promise<T>): Promise<T>;
  getApplicationContext(applicationId: string, context: JourneyScopeContext): Promise<ApplicationJourneyContext | null>;
  findEffectiveByCandidate(candidateId: string): Promise<SupplyJourneyEntity | null>;
  findByIdempotency(idempotencyKey: string): Promise<SupplyJourneyEntity | null>;
  create(input: { application: ApplicationJourneyContext; template: JourneyTemplateVersionEntity; ownerUserId: string; startedAt: Date; idempotencyKey: string; milestones: JourneyMilestoneSnapshot[] }): Promise<SupplyJourneyEntity>;
  findScoped(id: string, context: JourneyScopeContext): Promise<SupplyJourneyEntity | null>;
  updateStatus(id: string, expectedVersion: number, status: SupplyJourneyEntity['status'], patch: { completedAt?: Date | null; cancelReason?: string | null }): Promise<SupplyJourneyEntity | null>;
  list(context: JourneyScopeContext, filter?: { status?: SupplyJourneyEntity['status']; ownerId?: string }): Promise<SupplyJourneyEntity[]>;
}

export interface JourneyMutationEffects {
  audit(transaction: unknown, input: { action: string; entityId: string; actorUserId: string; correlationId: string; metadata?: Record<string, unknown> }): Promise<void>;
  outbox(transaction: unknown, input: { eventType: string; aggregateId: string; correlationId: string; payload: Record<string, unknown> }): Promise<void>;
}

export interface JourneyPreview {
  applicationId: string;
  applicationVersion: number;
  template: { id: string; templateId: string; code: string; name: string; version: number; checksum: string };
  milestones: Array<{ code: string; name: string; sequence: number; included: boolean; dueAt: string | null; requiredEvidence: unknown[] }>;
  warnings: string[];
  previewToken: string;
  expiresAt: string;
}

export interface JourneyEligibility {
  allowed: boolean;
  reasons: string[];
  activeJourney: SupplyJourneyEntity | null;
  templates: Array<{ id: string; name: string; version: string }>;
}

export class SupplyJourneyService {
  constructor(
    private readonly repository: JourneyRepository,
    private readonly templates: JourneyTemplateService,
    private readonly previewSecret: string,
    private readonly effects?: JourneyMutationEffects,
  ) {}

  async previewStart(applicationId: string, templateVersionId: string | undefined, context: JourneyScopeContext): Promise<JourneyPreview> {
    const application = await this.repository.getApplicationContext(applicationId, context);
    if (!application) throw new SupplyJourneyDomainError('APPLICATION_NOT_FOUND', 404);
    assertJourneyStartApplication(application);
    const active = await this.templates.list('ACTIVE');
    const template = this.pickTemplate(active, templateVersionId, application.context);
    const now = new Date();
    const included = buildMilestoneSnapshot(template, application.ownerUserId, application.context, now);
    const token = createPreviewToken({ applicationId, applicationVersion: application.version, templateVersionId: template.id, templateChecksum: template.checksum, contextHash: journeyContextFingerprint(application.context) }, this.previewSecret, now.getTime());
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    return {
      applicationId,
      applicationVersion: application.version,
      template: { id: template.id, templateId: template.templateId, code: template.code, name: template.name, version: template.version, checksum: template.checksum },
      milestones: template.milestones.map((milestone) => {
        const snapshot = included.find((item) => item.code === milestone.code);
        return { code: milestone.code, name: milestone.name, sequence: milestone.sequence, included: Boolean(snapshot), dueAt: snapshot?.dueAt?.toISOString() ?? null, requiredEvidence: milestone.evidenceRequirements };
      }),
      warnings: included.some((milestone) => milestone.code === 'DEPARTURE_PLAN') ? [] : ['DEPARTURE_MILESTONE_NOT_REQUIRED'],
      previewToken: token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async list(context: JourneyScopeContext, filter: { status?: SupplyJourneyEntity['status']; ownerId?: string } = {}): Promise<SupplyJourneyEntity[]> {
    return this.repository.list(context, filter);
  }

  async eligibility(applicationId: string, context: JourneyScopeContext): Promise<JourneyEligibility> {
    let application: ApplicationJourneyContext | null;
    try {
      application = await this.repository.getApplicationContext(applicationId, context);
    } catch (error) {
      if (error instanceof SupplyJourneyDomainError && error.code === 'JOURNEY_CONTEXT_MISSING') {
        return { allowed: false, reasons: ['JOURNEY_CONTEXT_MISSING'], activeJourney: null, templates: [] };
      }
      throw error;
    }
    if (!application) throw new SupplyJourneyDomainError('APPLICATION_NOT_FOUND', 404);

    const activeJourney = await this.repository.findEffectiveByCandidate(application.candidateId);
    const reasons: string[] = [];
    if (application.status !== 'PASSED') reasons.push('APPLICATION_NOT_PASSED');
    if (activeJourney) reasons.push('ACTIVE_JOURNEY_EXISTS');

    const templates: Array<{ id: string; name: string; version: string }> = [];
    if (reasons.length === 0) {
      try {
        const selected = this.pickTemplate(await this.templates.list('ACTIVE'), undefined, application.context);
        templates.push({ id: selected.id, name: selected.name, version: `v${selected.version}` });
      } catch (error) {
        if (error instanceof SupplyJourneyDomainError) reasons.push(error.code);
        else throw error;
      }
    }
    return { allowed: reasons.length === 0 && templates.length > 0, reasons, activeJourney, templates };
  }

  async startFromApplication(applicationId: string, input: { templateId: string; templateVersion: string; ownerUserId: string; startedAt: Date }, context: JourneyScopeContext): Promise<SupplyJourneyEntity> {
    const preview = await this.previewStart(applicationId, input.templateId, context);
    const expectedVersion = `v${preview.template.version}`;
    if (input.templateVersion !== expectedVersion && input.templateVersion !== String(preview.template.version)) {
      throw new SupplyJourneyDomainError('JOURNEY_TEMPLATE_NOT_APPLICABLE', 422, 'errors.journeyTemplateNotApplicable');
    }
    return this.start(applicationId, {
      previewToken: preview.previewToken,
      idempotencyKey: `application:${applicationId}:journey:${preview.template.id}:${input.startedAt.toISOString()}`,
      ownerUserId: input.ownerUserId,
      startedAt: input.startedAt,
    }, context);
  }

  async start(applicationId: string, input: { previewToken: string; idempotencyKey: string; ownerUserId?: string; startedAt?: Date }, context: JourneyScopeContext): Promise<SupplyJourneyEntity> {
    if (!input.idempotencyKey?.trim()) throw new SupplyJourneyDomainError('IDEMPOTENCY_KEY_REQUIRED');
    const token = verifyPreviewToken(input.previewToken, this.previewSecret);
    if (token.applicationId !== applicationId) throw new SupplyJourneyDomainError('JOURNEY_PREVIEW_STALE', 409);
    const replay = await this.repository.findByIdempotency(input.idempotencyKey);
    if (replay) return replay;
    return this.repository.withTransaction(async (repository, transaction) => {
      const application = await repository.getApplicationContext(applicationId, context);
      if (!application) throw new SupplyJourneyDomainError('APPLICATION_NOT_FOUND', 404);
      assertJourneyStartApplication(application);
      const effective = await repository.findEffectiveByCandidate(application.candidateId);
      if (effective) throw new SupplyJourneyDomainError('ACTIVE_JOURNEY_EXISTS', 409);
      const active = await this.templates.list('ACTIVE');
      const template = active.find((candidate) => candidate.id === token.templateVersionId);
      if (!template) throw new SupplyJourneyDomainError('JOURNEY_TEMPLATE_NOT_APPLICABLE', 422);
      assertTemplateContextBinding(token, application, template);
      const startedAt = input.startedAt ?? new Date();
      if (startedAt.getTime() > Date.now() + 60_000) throw new SupplyJourneyDomainError('JOURNEY_START_TIME_INVALID');
      const ownerUserId = input.ownerUserId ?? application.ownerUserId;
      if (ownerUserId !== application.ownerUserId && context.scope !== 'TEAM') throw new SupplyJourneyDomainError('JOURNEY_OWNER_OUT_OF_SCOPE', 403);
      const milestones = buildMilestoneSnapshot(template, ownerUserId, application.context, startedAt);
      try {
        const journey = await repository.create({ application, template, ownerUserId, startedAt, idempotencyKey: input.idempotencyKey, milestones });
        await this.recordEffects(transaction, context, journey, 'SUPPLY_JOURNEY_STARTED', 'supply_journey.started', { applicationId, candidateId: application.candidateId, templateVersionId: template.id });
        return journey;
      } catch (error) {
        if (error instanceof SupplyJourneyDomainError) throw error;
        const conflict = error as { code?: string };
        if (conflict.code === 'P2002') throw new SupplyJourneyDomainError('ACTIVE_JOURNEY_EXISTS', 409);
        throw error;
      }
    });
  }

  private pickTemplate(active: JourneyTemplateVersionEntity[], requestedId: string | undefined, context: JourneyContext): JourneyTemplateVersionEntity {
    if (requestedId) {
      const requested = active.find((template) => template.id === requestedId);
      if (!requested) throw new SupplyJourneyDomainError('JOURNEY_TEMPLATE_NOT_APPLICABLE', 422);
      return selectApplicableTemplate([requested], context);
    }
    return selectApplicableTemplate(active, context);
  }

  private async recordEffects(transaction: unknown, context: JourneyScopeContext, journey: SupplyJourneyEntity, action: string, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.effects) return;
    await this.effects.audit(transaction, { action, entityId: journey.id, actorUserId: context.actorId, correlationId: context.correlationId, metadata });
    await this.effects.outbox(transaction, { eventType, aggregateId: journey.id, correlationId: context.correlationId, payload: { journeyId: journey.id, candidateId: journey.candidateId, applicationId: journey.applicationId, ...metadata } });
  }
}
