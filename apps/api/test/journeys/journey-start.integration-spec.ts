import { describe, expect, it } from 'vitest';
import { JourneyTemplateService, type JourneyTemplateRepository } from '../../src/modules/supply-journeys/application/journey-template.service.js';
import { SupplyJourneyService, type JourneyRepository, type JourneyScopeContext } from '../../src/modules/supply-journeys/application/supply-journey.service.js';
import type { JourneyTemplateVersionEntity } from '../../src/modules/supply-journeys/domain/journey-template.js';
import type { ApplicationJourneyContext, SupplyJourneyEntity } from '../../src/modules/supply-journeys/domain/supply-journey.aggregate.js';
import type { JourneyTemplateStatus } from '../../src/modules/supply-journeys/domain/journey-template.js';

function activeTemplate(id = 'template-version-1'): JourneyTemplateVersionEntity {
  const now = new Date('2026-08-24T00:00:00Z');
  return { id, templateId: 'template-1', code: 'OUTSIDE-NEW-ENTRY', name: 'Ngoài Nhật', version: 1, status: 'ACTIVE', residenceContext: 'OUTSIDE_JAPAN', visaRouteVersionId: 'visa-1', caseType: 'NEW_ENTRY', sectorVersionId: null, occupationVersionId: null, applicability: null, milestones: [{ code: 'ACCEPTANCE', name: 'Xác nhận nhận việc', sequence: 1, parallel: false, dependencyCodes: [], dueSlaDays: 7, ownerRule: { role: 'JAPAN_COORDINATOR' }, checklistSchema: { type: 'object', properties: {} }, evidenceRequirements: [] }], checksum: 'sha256:' + 'a'.repeat(64), effectiveFrom: null, effectiveTo: null, createdAt: now, updatedAt: now };
}

class TemplateRepo implements JourneyTemplateRepository {
  private readonly version = activeTemplate();
  async withTransaction<T>(work: (repository: JourneyTemplateRepository, transaction: unknown) => Promise<T>): Promise<T> { return work(this, { kind: 'template-tx' }); }
  async findTemplate() { return { id: 'template-1', code: this.version.code, name: this.version.name }; }
  async createTemplate() { return { id: 'template-1', code: this.version.code, name: this.version.name }; }
  async findVersion(id: string) { return id === this.version.id ? this.version : null; }
  async createVersion(input: Omit<JourneyTemplateVersionEntity, 'id' | 'createdAt' | 'updatedAt'>) { return { ...input, id: this.version.id, createdAt: new Date(), updatedAt: new Date() }; }
  async updateStatus(id: string, status: JourneyTemplateStatus) { if (id !== this.version.id) throw new Error('not found'); return { ...this.version, status }; }
  async listVersions(status?: JourneyTemplateStatus) { return !status || status === 'ACTIVE' ? [this.version] : []; }
}

class JourneyRepo implements JourneyRepository {
  readonly applications = new Map<string, ApplicationJourneyContext>();
  readonly journeys = new Map<string, SupplyJourneyEntity>();
  private sequence = 0;
  async withTransaction<T>(work: (repository: JourneyRepository, transaction: unknown) => Promise<T>): Promise<T> { return work(this, { kind: 'journey-tx' }); }
  async getApplicationContext(applicationId: string, context: JourneyScopeContext) { const application = this.applications.get(applicationId); if (!application) return null; if (context.scope === 'TEAM' ? application.teamId !== context.teamId : application.ownerUserId !== context.actorId) return null; return application; }
  async findEffectiveByCandidate(candidateId: string) { return [...this.journeys.values()].find((journey) => journey.candidateId === candidateId && ['ACTIVE', 'ON_HOLD'].includes(journey.status)) ?? null; }
  async findByIdempotency(idempotencyKey: string) { return [...this.journeys.values()].find((journey) => journey.idempotencyKey === idempotencyKey) ?? null; }
  async create(input: { application: ApplicationJourneyContext; template: JourneyTemplateVersionEntity; ownerUserId: string; startedAt: Date; idempotencyKey: string; milestones: SupplyJourneyEntity['milestones'] }) { const now = new Date(); const journey: SupplyJourneyEntity = { id: `journey-${++this.sequence}`, candidateId: input.application.candidateId, applicationId: input.application.applicationId, templateVersionId: input.template.id, templateChecksum: input.template.checksum, ownerUserId: input.ownerUserId, teamId: input.application.teamId, status: 'ACTIVE', contextSnapshot: input.application.context, startedAt: input.startedAt, completedAt: null, cancelReason: null, idempotencyKey: input.idempotencyKey, version: 1, milestones: input.milestones.map((milestone, index) => ({ ...milestone, id: `milestone-${index + 1}` })), createdAt: now, updatedAt: now }; this.journeys.set(journey.id, journey); return journey; }
  async findScoped(id: string, context: JourneyScopeContext) { const journey = this.journeys.get(id); return journey && (context.scope === 'TEAM' ? journey.teamId === context.teamId : journey.ownerUserId === context.actorId) ? journey : null; }
  async updateStatus(id: string, expectedVersion: number, status: SupplyJourneyEntity['status'], patch: { completedAt?: Date | null; cancelReason?: string | null }) { const journey = this.journeys.get(id); if (!journey || journey.version !== expectedVersion) return null; const updated = { ...journey, status, version: journey.version + 1, completedAt: patch.completedAt ?? null, cancelReason: patch.cancelReason ?? null, updatedAt: new Date() }; this.journeys.set(id, updated); return updated; }
  async list(context: JourneyScopeContext, filter: { status?: SupplyJourneyEntity['status']; ownerId?: string } = {}) { return [...this.journeys.values()].filter((journey) => (context.scope === 'TEAM' ? journey.teamId === context.teamId : journey.ownerUserId === context.actorId) && (!filter.status || journey.status === filter.status) && (!filter.ownerId || journey.ownerUserId === filter.ownerId)); }
}

const scope: JourneyScopeContext = { actorId: 'user-1', teamId: 'team-1', scope: 'TEAM', requestId: 'req-1', correlationId: 'corr-1' };

describe('supply journey preview and atomic start', () => {
  it('binds preview to application version/template checksum and replays idempotency', async () => {
    const repository = new JourneyRepo();
    repository.applications.set('application-1', { applicationId: 'application-1', candidateId: 'candidate-1', ownerUserId: 'user-1', teamId: 'team-1', status: 'PASSED', version: 3, context: { residenceContext: 'OUTSIDE_JAPAN', visaRouteVersionId: 'visa-1', caseType: 'NEW_ENTRY', sectorVersionId: null, occupationVersionId: null } });
    const templates = new JourneyTemplateService(new TemplateRepo());
    const service = new SupplyJourneyService(repository, templates, 'test-preview-secret');
    const preview = await service.previewStart('application-1', undefined, scope);
    expect(preview.template.id).toBe('template-version-1');
    expect(preview.milestones[0].included).toBe(true);
    const started = await service.start('application-1', { previewToken: preview.previewToken, idempotencyKey: 'journey-start-1' }, scope);
    const replay = await service.start('application-1', { previewToken: preview.previewToken, idempotencyKey: 'journey-start-1' }, scope);
    expect(started.id).toBe(replay.id);
    expect(started.milestones).toHaveLength(1);
  });

  it('rejects a second effective journey and stale preview', async () => {
    const repository = new JourneyRepo();
    repository.applications.set('application-1', { applicationId: 'application-1', candidateId: 'candidate-1', ownerUserId: 'user-1', teamId: 'team-1', status: 'PASSED', version: 1, context: { residenceContext: 'OUTSIDE_JAPAN', visaRouteVersionId: 'visa-1', caseType: 'NEW_ENTRY' } });
    const templates = new JourneyTemplateService(new TemplateRepo());
    const service = new SupplyJourneyService(repository, templates, 'test-preview-secret');
    const preview = await service.previewStart('application-1', undefined, scope);
    repository.applications.get('application-1')!.version = 2;
    await expect(service.start('application-1', { previewToken: preview.previewToken, idempotencyKey: 'journey-start-2' }, scope)).rejects.toMatchObject({ code: 'JOURNEY_PREVIEW_STALE' });
  });
});
