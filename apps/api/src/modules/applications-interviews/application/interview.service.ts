import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { InterviewDomainError, validateSchedule, type InterviewMode } from '../domain/interview.types.js';
import type { ApplicationContext } from '../domain/application.types.js';
import { NotificationService } from '../../notifications/application/notification.service.js';

function jsonArray(value: Prisma.JsonValue): unknown[] { return Array.isArray(value) ? value : []; }
type InterviewParticipantRow = { user: { id: string; displayName: string } };
type InterviewRow = { id: string; roundNo: number; scheduledAt: Date; scheduledEndAt: Date; timeZone: string; mode: string; meetingUrl: string | null; location: string | null; scheduleStatus: string; result: string | null; feedback: string | null; strengths: Prisma.JsonValue; concerns: Prisma.JsonValue; nextStep: string | null; version: number; createdAt: Date; updatedAt: Date; participants: InterviewParticipantRow[]; history: unknown[] };

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditWriter, private readonly outbox: OutboxRepository, private readonly notifications: NotificationService) {}

  async create(applicationId: string, input: { scheduledAt: Date; scheduledEndAt: Date; timeZone: string; mode: InterviewMode; meetingUrl?: string | null; location?: string | null; participants: string[] }, context: ApplicationContext) {
    validateSchedule(input);
    return this.prisma.$transaction(async (tx) => {
      const application = await this.application(tx, applicationId, context);
      if (['PASSED', 'FAILED', 'WITHDRAWN'].includes(application.status)) throw new InterviewDomainError('APPLICATION_NOT_ACTIVE', 'errors.applicationNotActive', 409);
      const round = (await tx.interview.aggregate({ where: { applicationId }, _max: { roundNo: true } }))._max.roundNo ?? 0;
      const template = await tx.interviewQuestionTemplateVersion.findFirst({ where: { status: 'ACTIVE' }, orderBy: [{ createdAt: 'desc' }, { version: 'desc' }, { id: 'desc' }] });
      if (!template) throw new InterviewDomainError('INTERVIEW_TEMPLATE_NOT_CONFIGURED', 'errors.interviewTemplateNotConfigured', 422);
      const participantCount = await tx.user.count({ where: { id: { in: input.participants }, status: 'ACTIVE' } });
      if (participantCount !== input.participants.length) throw new InterviewDomainError('INTERVIEW_PARTICIPANT_NOT_FOUND', 'errors.interviewParticipantNotFound', 422);
      await this.assertParticipantConflict(tx, input.participants, input.scheduledAt, input.scheduledEndAt);
      if (application.status === 'MATCHED') {
        const statusUpdate = await tx.application.update({ where: { id: applicationId }, data: { status: 'IN_INTERVIEW_PROCESS', lastActivityAt: new Date(), version: { increment: 1 } } });
        const applicationVersion = statusUpdate.version;
        await tx.applicationStatusHistory.create({ data: { applicationId, fromStatus: 'MATCHED', toStatus: 'IN_INTERVIEW_PROCESS', actorUserId: context.actorId, metadata: { reason: 'INTERVIEW_SCHEDULED' } } });
        await this.audit.append(tx, { action: 'APPLICATION_STATUS_CHANGED', entityType: 'Application', entityId: applicationId, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { fromStatus: 'MATCHED', toStatus: 'IN_INTERVIEW_PROCESS', reason: 'INTERVIEW_SCHEDULED' } });
        await this.outbox.append(tx, { eventType: 'application.status_changed', aggregateType: 'Application', aggregateId: applicationId, idempotencyKey: `application.status:${applicationId}:${applicationVersion}`, correlationId: context.correlationId, payload: { fromStatus: 'MATCHED', toStatus: 'IN_INTERVIEW_PROCESS', reason: 'INTERVIEW_SCHEDULED' } });
      }
      try {
        const interview = await tx.interview.create({ data: {
          applicationId, ownerId: context.actorId, roundNo: round + 1, scheduledAt: input.scheduledAt, scheduledEndAt: input.scheduledEndAt, timeZone: input.timeZone.trim(), mode: input.mode,
          meetingUrl: input.meetingUrl ?? null, location: input.location ?? null, scheduleStatus: 'SCHEDULED', result: 'PENDING', questionSnapshot: { templateVersionId: template.id, version: template.version, questions: template.questions } as Prisma.InputJsonValue,
          participants: { create: input.participants.map((userId) => ({ userId })) },
        }, include: this.include() });
        await tx.interviewHistory.create({ data: { interviewId: interview.id, actorUserId: context.actorId, action: 'SCHEDULED', toStatus: 'SCHEDULED' } });
        await this.audit.append(tx, { action: 'INTERVIEW_SCHEDULED', entityType: 'Interview', entityId: interview.id, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { applicationId, roundNo: round + 1 } });
        await this.outbox.append(tx, { eventType: 'interview.scheduled', aggregateType: 'Interview', aggregateId: interview.id, idempotencyKey: `interview.scheduled:${interview.id}`, correlationId: context.correlationId, payload: { applicationId, roundNo: round + 1 } });
        await Promise.all(input.participants.map((userId) => this.notifications.create({
          userId,
          kind: 'INTERVIEW_SCHEDULED',
          severity: 'WARNING',
          params: { name: application.candidate.name },
          href: `/applications?selectedId=${applicationId}`,
          dedupeKey: `interview-notification:${interview.id}:${userId}`,
        }, tx)));
        return this.map(interview);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new InterviewDomainError('INTERVIEW_ROUND_CONFLICT', 'errors.interviewRoundConflict', 409);
        throw error;
      }
    });
  }

  async reschedule(applicationId: string, interviewId: string, input: { scheduledAt: Date; scheduledEndAt: Date; timeZone: string; mode: InterviewMode; meetingUrl?: string | null; location?: string | null; participants: string[]; reason: string }, version: number, context: ApplicationContext) {
    validateSchedule(input);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.find(tx, applicationId, interviewId, context);
      if (current.version !== version) throw new InterviewDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      if (current.scheduleStatus !== 'SCHEDULED') throw new InterviewDomainError('INTERVIEW_NOT_RESCHEDULABLE', 'errors.interviewNotReschedulable', 409);
      await this.assertParticipantConflict(tx, input.participants, input.scheduledAt, input.scheduledEndAt, interviewId);
      const updated = await tx.interview.update({ where: { id: interviewId, version }, data: { scheduledAt: input.scheduledAt, scheduledEndAt: input.scheduledEndAt, timeZone: input.timeZone, mode: input.mode, meetingUrl: input.meetingUrl ?? null, location: input.location ?? null, version: { increment: 1 } }, include: this.include() });
      await tx.interviewParticipant.deleteMany({ where: { interviewId } });
      await tx.interviewParticipant.createMany({ data: input.participants.map((userId) => ({ interviewId, userId })) });
      await tx.interviewHistory.create({ data: { interviewId, actorUserId: context.actorId, action: 'RESCHEDULED', fromStatus: current.scheduleStatus, toStatus: 'SCHEDULED', previousScheduledAt: current.scheduledAt, previousScheduledEndAt: current.scheduledEndAt, reason: input.reason } });
      await this.audit.append(tx, { action: 'INTERVIEW_RESCHEDULED', entityType: 'Interview', entityId: interviewId, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { applicationId, reason: input.reason } });
      await this.outbox.append(tx, { eventType: 'interview.rescheduled', aggregateType: 'Interview', aggregateId: interviewId, idempotencyKey: `interview.rescheduled:${interviewId}:${updated.version}`, correlationId: context.correlationId, payload: { applicationId, reason: input.reason } });
      return this.map({ ...updated, participants: await tx.interviewParticipant.findMany({ where: { interviewId }, include: { user: { select: { id: true, displayName: true } } } }), history: await tx.interviewHistory.findMany({ where: { interviewId }, orderBy: { createdAt: 'asc' } }) });
    });
  }

  async cancel(applicationId: string, interviewId: string, version: number, reason: string, status: 'CANCELLED' | 'NO_SHOW', context: ApplicationContext) {
    if (!reason?.trim()) throw new InterviewDomainError('REASON_REQUIRED', 'errors.reasonRequired', 422);
    return this.transition(applicationId, interviewId, version, status, reason, context);
  }

  async complete(applicationId: string, interviewId: string, input: { result: 'PENDING' | 'ADVANCE_NEXT_ROUND' | 'PASS' | 'FAIL'; feedback: string; strengths: string[]; concerns: string[]; nextStep?: string }, version: number, context: ApplicationContext) {
    if (!input.feedback?.trim()) throw new InterviewDomainError('REQUIRED_FEEDBACK_MISSING', 'errors.requiredFeedbackMissing', 422);
    return this.prisma.$transaction(async (tx) => {
      const current = await this.find(tx, applicationId, interviewId, context);
      if (current.version !== version) throw new InterviewDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      if (!['SCHEDULED', 'DRAFT'].includes(current.scheduleStatus)) throw new InterviewDomainError('INTERVIEW_NOT_COMPLETABLE', 'errors.interviewNotCompletable', 409);
      const updated = await tx.interview.update({ where: { id: interviewId, version }, data: { scheduleStatus: 'COMPLETED', result: input.result, feedback: input.feedback.trim(), strengths: input.strengths, concerns: input.concerns, nextStep: input.nextStep ?? null, version: { increment: 1 } }, include: this.include() });
      await tx.interviewHistory.create({ data: { interviewId, actorUserId: context.actorId, action: 'COMPLETED', fromStatus: current.scheduleStatus, toStatus: 'COMPLETED', reason: input.feedback } });
      await this.audit.append(tx, { action: 'INTERVIEW_COMPLETED', entityType: 'Interview', entityId: interviewId, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { applicationId, result: input.result } });
      await this.outbox.append(tx, { eventType: 'interview.completed', aggregateType: 'Interview', aggregateId: interviewId, idempotencyKey: `interview.completed:${interviewId}:${updated.version}`, correlationId: context.correlationId, payload: { applicationId, result: input.result } });
      return this.map(updated);
    });
  }

  async questionSnapshot(interviewId: string, context: ApplicationContext) {
    const current = await this.prisma.interview.findFirst({ where: { id: interviewId, application: this.applicationScope(context) }, select: { id: true, questionSnapshot: true, version: true } });
    if (!current) throw new InterviewDomainError('INTERVIEW_NOT_FOUND', 'errors.interviewNotFound', 404);
    return current;
  }

  private async transition(applicationId: string, interviewId: string, version: number, status: 'CANCELLED' | 'NO_SHOW', reason: string, context: ApplicationContext) {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.find(tx, applicationId, interviewId, context);
      if (current.version !== version) throw new InterviewDomainError('VERSION_CONFLICT', 'errors.versionConflict', 409);
      if (!['SCHEDULED', 'DRAFT'].includes(current.scheduleStatus)) throw new InterviewDomainError('INTERVIEW_NOT_MUTABLE', 'errors.interviewNotMutable', 409);
      const updated = await tx.interview.update({ where: { id: interviewId, version }, data: { scheduleStatus: status, version: { increment: 1 } }, include: this.include() });
      await tx.interviewHistory.create({ data: { interviewId, actorUserId: context.actorId, action: status, fromStatus: current.scheduleStatus, toStatus: status, reason } });
      await this.audit.append(tx, { action: `INTERVIEW_${status}`, entityType: 'Interview', entityId: interviewId, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { applicationId, reason } });
      await this.outbox.append(tx, { eventType: 'interview.cancelled', aggregateType: 'Interview', aggregateId: interviewId, idempotencyKey: `interview.cancelled:${interviewId}:${updated.version}`, correlationId: context.correlationId, payload: { applicationId, status, reason } });
      return this.map(updated);
    });
  }

  private applicationScope(context: ApplicationContext): Prisma.ApplicationWhereInput { return context.scope === 'TEAM' && context.teamId ? { teamId: context.teamId } : { ownerId: context.actorId }; }

  private async application(tx: Prisma.TransactionClient, id: string, context: ApplicationContext) {
    const application = await tx.application.findFirst({ where: { id, ...this.applicationScope(context) }, select: { id: true, status: true, candidate: { select: { name: true } } } });
    if (!application) throw new InterviewDomainError('APPLICATION_NOT_FOUND', 'errors.applicationNotFound', 404);
    return application;
  }

  private async find(tx: Prisma.TransactionClient, applicationId: string, interviewId: string, context: ApplicationContext) {
    const interview = await tx.interview.findFirst({ where: { id: interviewId, applicationId, application: this.applicationScope(context) }, include: this.include() });
    if (!interview) throw new InterviewDomainError('INTERVIEW_NOT_FOUND', 'errors.interviewNotFound', 404);
    return interview;
  }

  private async assertParticipantConflict(tx: Prisma.TransactionClient, participantIds: string[], start: Date, end: Date, excludeId?: string) {
    const conflict = await tx.interviewParticipant.findFirst({ where: { userId: { in: participantIds }, ...(excludeId ? { interviewId: { not: excludeId } } : {}), interview: { scheduleStatus: 'SCHEDULED', scheduledAt: { lt: end }, scheduledEndAt: { gt: start } } } });
    if (conflict) throw new InterviewDomainError('INTERVIEW_SCHEDULE_CONFLICT', 'errors.interviewScheduleConflict', 409);
  }

  private include() { return { participants: { include: { user: { select: { id: true, displayName: true } } } }, history: { orderBy: { createdAt: 'asc' as const } } }; }

  private map(row: InterviewRow) {
    return { id: row.id, round: row.roundNo, scheduledAt: row.scheduledAt.toISOString(), scheduledEndAt: row.scheduledEndAt.toISOString(), timeZone: row.timeZone, mode: row.mode, meetingUrl: row.meetingUrl, location: row.location, participants: (row.participants ?? []).map((participant) => ({ id: participant.user.id, name: participant.user.displayName })), scheduleStatus: row.scheduleStatus, result: row.result, feedback: row.feedback, strengths: jsonArray(row.strengths), concerns: jsonArray(row.concerns), nextStep: row.nextStep, version: row.version, history: row.history ?? [], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
  }
}
