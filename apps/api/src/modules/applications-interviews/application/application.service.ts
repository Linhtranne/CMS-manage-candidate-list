import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { ApplicationDomainError, assertApplicationTransition, type ApplicationContext, type ApplicationSource, type ApplicationStatus } from '../domain/application.types.js';
import { NotificationService } from '../../notifications/application/notification.service.js';

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function jsonArray(value: Prisma.JsonValue): unknown[] { return Array.isArray(value) ? value : []; }
function decodeCursor(value: string | undefined): { updatedAt: Date; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { updatedAt?: string; id?: string };
    if (!parsed.updatedAt || !parsed.id) return null;
    const updatedAt = new Date(parsed.updatedAt);
    return Number.isNaN(updatedAt.getTime()) ? null : { updatedAt, id: parsed.id };
  } catch { return null; }
}
function encodeCursor(updatedAt: Date, id: string): string { return Buffer.from(JSON.stringify({ updatedAt: updatedAt.toISOString(), id }), 'utf8').toString('base64url'); }

type ParticipantRow = { user: { id: string; displayName: string } };
type InterviewRow = { id: string; roundNo: number; scheduledAt: Date; scheduledEndAt: Date; timeZone: string; mode: string; meetingUrl: string | null; location: string | null; scheduleStatus: string; result: string | null; feedback: string | null; strengths: Prisma.JsonValue; concerns: Prisma.JsonValue; nextStep: string | null; version: number; createdAt: Date; updatedAt: Date; participants: ParticipantRow[]; history: unknown[] };
type ApplicationHistoryRow = { id: string; fromStatus: string; toStatus: string; actor: { id: string; displayName: string }; reason: string | null; metadata: Prisma.JsonValue; createdAt: Date };
type ApplicationRow = { id: string; candidate: { id: string; code: string; name: string }; jobOrder: { id: string; code: string; position: string; client: { id: string; name: string } }; owner: { id: string; displayName: string }; status: string; source: string; appliedAt: Date; lastActivityAt: Date; dueAt: Date | null; version: number; decisionReason: string | null; interviews: InterviewRow[]; history: ApplicationHistoryRow[] };

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditWriter, private readonly outbox: OutboxRepository, private readonly notifications: NotificationService) {}

  async createMany(jobOrderId: string, candidateIds: string[], source: ApplicationSource, context: ApplicationContext): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const candidateId of candidateIds) ids.push((await this.createWithinTransaction(tx, jobOrderId, candidateId, source, context)).id);
      return ids;
    });
  }

  async create(jobOrderId: string, candidateId: string, source: ApplicationSource, context: ApplicationContext) {
    return this.prisma.$transaction((tx) => this.createWithinTransaction(tx, jobOrderId, candidateId, source, context));
  }

  private async createWithinTransaction(tx: Prisma.TransactionClient, jobOrderId: string, candidateId: string, source: ApplicationSource, context: ApplicationContext) {
    const [candidate, order] = await Promise.all([
        tx.candidate.findUnique({ where: { id: candidateId }, include: { profiles: true } }),
        tx.jobOrder.findUnique({ where: { id: jobOrderId }, include: { client: true } }),
    ]);
    if (!candidate || candidate.recordStatus !== 'ACTIVE') throw new ApplicationDomainError('CANDIDATE_NOT_FOUND', 'errors.candidateNotFound', 404);
    if (!order) throw new ApplicationDomainError('JOB_ORDER_NOT_FOUND', 'errors.jobOrderNotFound', 404);
    this.assertScope(candidate, context);
    this.assertScope(order, context);
    if (order.status !== 'OPEN') throw new ApplicationDomainError('JOB_ORDER_NOT_OPEN', 'errors.jobOrderNotOpen', 409);
    if (candidate.contactabilityStatus === 'DO_NOT_CONTACT') throw new ApplicationDomainError('CANDIDATE_DO_NOT_CONTACT', 'errors.candidateDoNotContact', 422);
    try {
      const application = await tx.application.create({ data: {
          candidateId, jobOrderId, ownerId: context.actorId, teamId: context.teamId, status: 'MATCHED', source,
          requirementSnapshot: { version: order.requirementVersion, ...jsonObject(order.requirementSnapshot) } as Prisma.InputJsonValue,
          profileSnapshot: { profiles: candidate.profiles.map((profile) => ({ id: profile.id, industryLabel: profile.industryLabel, occupation: profile.occupation, yearsExperience: profile.yearsExperience, skills: jsonArray(profile.skills) })) } as Prisma.InputJsonValue,
      }, include: this.include() });
      await tx.applicationStatusHistory.create({ data: { applicationId: application.id, fromStatus: 'NEW', toStatus: 'MATCHED', actorUserId: context.actorId, metadata: { source } } });
      await this.audit.append(tx, { action: 'APPLICATION_CREATED', entityType: 'Application', entityId: application.id, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { candidateId, jobOrderId, source } });
      await this.outbox.append(tx, { eventType: 'application.created', aggregateType: 'Application', aggregateId: application.id, idempotencyKey: `application.created:${application.id}`, correlationId: context.correlationId, payload: { candidateId, jobOrderId, source } });
      return this.map(application);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApplicationDomainError('ACTIVE_APPLICATION_EXISTS', 'errors.activeApplicationExists', 409);
      throw error;
    }
  }

  async get(id: string, context: ApplicationContext) {
    const application = await this.prisma.application.findFirst({ where: this.scopeWhere({ id }, context), include: this.include() });
    if (!application) throw new ApplicationDomainError('APPLICATION_NOT_FOUND', 'errors.applicationNotFound', 404);
    return this.map(application);
  }

  async list(filter: { query?: string; view?: string; orderId?: string; cursor?: string }, context: ApplicationContext) {
    const where: Prisma.ApplicationWhereInput = this.scopeWhere({}, context);
    if (filter.orderId) where.jobOrderId = filter.orderId;
    if (filter.query?.trim()) {
      const term = filter.query.trim();
      where.OR = [{ candidate: { name: { contains: term, mode: 'insensitive' } } }, { jobOrder: { code: { contains: term, mode: 'insensitive' } } }];
    }
    if (filter.view === 'passed') where.status = 'PASSED';
    if (filter.view === 'failed') where.status = 'FAILED';
    if (filter.view === 'withdrawn') where.status = 'WITHDRAWN';
    if (filter.view === 'waiting-result') where.status = 'IN_INTERVIEW_PROCESS';
    if (filter.view === 'waiting-interview') {
      where.status = { notIn: ['PASSED', 'FAILED', 'WITHDRAWN'] };
      where.interviews = { some: { scheduleStatus: 'SCHEDULED' } };
    }
    if (filter.view === 'interviewed') where.interviews = { some: { scheduleStatus: 'COMPLETED' } };
    const cursor = decodeCursor(filter.cursor);
    if (cursor) where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: [{ updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }] }];
    const rows = await this.prisma.application.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 101, include: this.include() });
    const hasMore = rows.length > 100;
    const pageRows = rows.slice(0, 100);
    const last = pageRows.at(-1);
    return { items: await Promise.all(pageRows.map((row) => this.map(row))), page: { hasMore, nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null } };
  }

  async transition(id: string, status: ApplicationStatus, version: number, reason: string | undefined, context: ApplicationContext) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.application.findFirst({ where: this.scopeWhere({ id }, context), include: this.include() });
      if (!current) throw new ApplicationDomainError('APPLICATION_NOT_FOUND', 'errors.applicationNotFound', 404);
      if (current.version !== version) throw new ApplicationDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      assertApplicationTransition(current.status as ApplicationStatus, status, reason);
      const updated = await tx.application.updateMany({ where: { id, version }, data: { status, decisionReason: reason?.trim() ?? null, lastActivityAt: new Date(), version: { increment: 1 } } });
      if (updated.count !== 1) throw new ApplicationDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      const next = await tx.application.findUniqueOrThrow({ where: { id }, include: this.include() });
      await tx.applicationStatusHistory.create({ data: { applicationId: id, fromStatus: current.status, toStatus: status, actorUserId: context.actorId, reason } });
      await this.audit.append(tx, { action: 'APPLICATION_STATUS_CHANGED', entityType: 'Application', entityId: id, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { fromStatus: current.status, toStatus: status, reason } });
      await this.outbox.append(tx, { eventType: status === 'PASSED' ? 'application.passed' : 'application.status_changed', aggregateType: 'Application', aggregateId: id, idempotencyKey: `application.status:${id}:${next.version}`, correlationId: context.correlationId, payload: { fromStatus: current.status, toStatus: status, reason } });
      await this.notifications.create({
        userId: current.owner.id,
        kind: 'APPLICATION_DECISION',
        severity: status === 'PASSED' ? 'INFO' : status === 'ON_HOLD' ? 'WARNING' : 'DANGER',
        params: { name: current.candidate.name, status },
        href: `/applications?selectedId=${id}`,
        dedupeKey: `application-notification:${id}:${next.version}`,
      }, tx);
      return this.map(next);
    });
  }

  async history(id: string, context: ApplicationContext) {
    await this.get(id, context);
    return this.prisma.applicationStatusHistory.findMany({ where: { applicationId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { actor: { select: { id: true, displayName: true } } } });
  }

  private scopeWhere(where: Prisma.ApplicationWhereInput, context: ApplicationContext): Prisma.ApplicationWhereInput {
    const scope: Prisma.ApplicationWhereInput = context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerId: context.actorId };
    return { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), scope] };
  }

  private assertScope(resource: { ownerId: string; teamId: string | null }, context: ApplicationContext): void {
    const allowed = context.scope === 'TEAM' && context.teamId ? resource.teamId === context.teamId : resource.ownerId === context.actorId;
    if (!allowed) throw new ApplicationDomainError('FORBIDDEN', 'errors.forbidden', 403);
  }

  private include() {
    return { candidate: { select: { id: true, code: true, name: true } }, jobOrder: { include: { client: { select: { id: true, name: true } } } }, owner: { select: { id: true, displayName: true } }, interviews: { orderBy: { roundNo: 'asc' as const }, include: { participants: { include: { user: { select: { id: true, displayName: true } } } }, history: true } }, history: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }], include: { actor: { select: { id: true, displayName: true } } } } };
  }

  private async map(row: ApplicationRow) {
    const [documents, notes] = await Promise.all([
      this.prisma.document.findMany({
        where: { candidateId: row.candidate.id, status: { notIn: ['DELETED', 'REJECTED'] } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.entityNote.findMany({ where: { entityType: 'APPLICATION', entityId: row.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { content: true } }),
    ]);
    return {
      id: row.id, candidate: { id: row.candidate.id, code: row.candidate.code, name: row.candidate.name },
      order: { id: row.jobOrder.id, code: row.jobOrder.code, position: row.jobOrder.position },
      client: { id: row.jobOrder.client.id, name: row.jobOrder.client.name }, owner: { id: row.owner.id, name: row.owner.displayName },
      status: row.status, source: row.source, appliedAt: row.appliedAt.toISOString(), lastActivityAt: row.lastActivityAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null,
      version: row.version, decisionReason: row.decisionReason, interviews: (row.interviews ?? []).map((interview) => ({ id: interview.id, round: interview.roundNo, scheduledAt: interview.scheduledAt.toISOString(), scheduledEndAt: interview.scheduledEndAt.toISOString(), timeZone: interview.timeZone, mode: interview.mode, meetingUrl: interview.meetingUrl, location: interview.location, participants: interview.participants.map((participant) => ({ id: participant.user.id, name: participant.user.displayName })), scheduleStatus: interview.scheduleStatus, result: interview.result, feedback: interview.feedback, strengths: jsonArray(interview.strengths), concerns: jsonArray(interview.concerns), nextStep: interview.nextStep, version: interview.version, history: interview.history ?? [], createdAt: interview.createdAt.toISOString(), updatedAt: interview.updatedAt.toISOString() })),
      history: (row.history ?? []).map((event) => ({
        id: event.id,
        type: event.fromStatus === 'NEW' && event.toStatus === 'MATCHED' ? 'APPLICATION_CREATED' as const : 'STATUS_CHANGED' as const,
        occurredAt: event.createdAt.toISOString(),
        actor: { id: event.actor.id, name: event.actor.displayName },
        summary: event.reason?.trim() || `Chuyển trạng thái từ ${event.fromStatus} sang ${event.toStatus}.`,
        metadata: { fromStatus: event.fromStatus, toStatus: event.toStatus, ...jsonObject(event.metadata) },
      })),
      notes: notes.map((item) => item.content),
      files: documents.map((document) => document.title),
    };
  }
}
