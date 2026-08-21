import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { AuditWriter } from '../../audit/audit-writer.js';
import { OutboxRepository } from '../../../platform/outbox/outbox.repository.js';
import { CandidateDomainError } from '../domain/candidate.rules.js';

export interface MergeContext { actorId: string; teamId?: string; correlationId: string; requestId: string; approvalId?: string; }

@Injectable()
export class CandidateMergeService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditWriter, private readonly outbox: OutboxRepository) {}

  async merge(input: { winnerCandidateId: string; loserCandidateId: string; reason: string; expectedVersion: number }, context: MergeContext) {
    if (!input.reason?.trim()) throw new CandidateDomainError('REASON_REQUIRED', 'merge reason is required', 422);
    if (input.winnerCandidateId === input.loserCandidateId) throw new CandidateDomainError('MERGE_CONFLICT', 'winner and loser must differ', 409);
    return this.prisma.$transaction(async (tx) => {
      const [winner, loser] = await Promise.all([
        tx.candidate.findUnique({ where: { id: input.winnerCandidateId }, include: { profiles: true } }),
        tx.candidate.findUnique({ where: { id: input.loserCandidateId }, include: { profiles: true } }),
      ]);
      if (!winner || !loser) throw new CandidateDomainError('CANDIDATE_NOT_FOUND', 'candidate was not found', 404);
      this.assertScope(winner, context); this.assertScope(loser, context);
      if (loser.version !== input.expectedVersion) throw new CandidateDomainError('VERSION_CONFLICT', 'candidate version changed', 409);
      if (loser.recordStatus === 'ARCHIVED') throw new CandidateDomainError('MERGE_CONFLICT', 'candidate is already archived or merged', 409);
      const activeStatuses = ['MATCHED', 'IN_INTERVIEW_PROCESS', 'ON_HOLD'];
      const [winnerApps, loserApps] = await Promise.all([
        tx.application.findMany({ where: { candidateId: winner.id, status: { in: activeStatuses } }, select: { jobOrderId: true } }),
        tx.application.findMany({ where: { candidateId: loser.id, status: { in: activeStatuses } }, select: { jobOrderId: true } }),
      ]);
      const winnerOrders = new Set(winnerApps.map((app) => app.jobOrderId));
      if (loserApps.some((app) => winnerOrders.has(app.jobOrderId))) throw new CandidateDomainError('MERGE_CONFLICT', 'both candidates have active applications for the same order', 409);
      await tx.candidateMergeAlias.create({ data: { winnerCandidateId: winner.id, loserCandidateId: loser.id, reason: input.reason.trim(), mergedById: context.actorId } });
      await tx.application.updateMany({ where: { candidateId: loser.id }, data: { candidateId: winner.id } });
      for (const profile of loser.profiles) {
        const existing = await tx.candidateOccupationProfile.findUnique({ where: { candidateId_industryLabel_occupation: { candidateId: winner.id, industryLabel: profile.industryLabel, occupation: profile.occupation } }, select: { id: true } });
        if (existing) await tx.candidateOccupationProfile.update({ where: { id: profile.id }, data: { status: 'ARCHIVED' } });
        else await tx.candidateOccupationProfile.update({ where: { id: profile.id }, data: { candidateId: winner.id } });
      }
      const updatedLoser = await tx.candidate.updateMany({ where: { id: loser.id, version: input.expectedVersion }, data: { recordStatus: 'ARCHIVED', version: { increment: 1 } } });
      if (updatedLoser.count !== 1) throw new CandidateDomainError('VERSION_CONFLICT', 'candidate version changed', 409);
      await this.audit.append(tx, { action: 'CANDIDATE_MERGED', entityType: 'Candidate', entityId: loser.id, actorUserId: context.actorId, correlationId: context.correlationId, metadataJson: { winnerCandidateId: winner.id, loserCandidateId: loser.id, reason: input.reason.trim(), ...(context.approvalId ? { approvalId: context.approvalId } : {}) } });
      await this.outbox.append(tx, { eventType: 'candidate.merged', aggregateType: 'Candidate', aggregateId: winner.id, idempotencyKey: `candidate.merged:${loser.id}`, correlationId: context.correlationId, payload: { winnerCandidateId: winner.id, loserCandidateId: loser.id } });
      return { winnerCandidateId: winner.id, loserCandidateId: loser.id, mergedAt: new Date().toISOString() };
    });
  }

  async reviewCase(caseId: string, input: { action: 'MARK_REVIEWED' | 'KEEP_SEPARATE' | 'MERGE'; targetCandidateId?: string; reason?: string; version: number }, context: MergeContext) {
    const duplicate = await this.prisma.candidateDuplicateCase.findUnique({ where: { id: caseId } });
    if (!duplicate) throw new CandidateDomainError('DUPLICATE_CASE_NOT_FOUND', 'duplicate case was not found', 404);
    if (duplicate.version !== input.version) throw new CandidateDomainError('VERSION_CONFLICT', 'duplicate case version changed', 409);
    if (input.action === 'MERGE') {
      if (!input.targetCandidateId) throw new CandidateDomainError('MERGE_CONFLICT', 'merge target is required', 422);
      const result = await this.merge({ winnerCandidateId: input.targetCandidateId, loserCandidateId: duplicate.sourceCandidateId, reason: input.reason ?? '', expectedVersion: (await this.prisma.candidate.findUniqueOrThrow({ where: { id: duplicate.sourceCandidateId }, select: { version: true } })).version }, context);
      await this.prisma.candidateDuplicateCase.update({ where: { id: caseId }, data: { state: 'MERGED', targetCandidateId: input.targetCandidateId, resolutionReason: input.reason, resolvedById: context.actorId, resolvedAt: new Date(), version: { increment: 1 } } });
      return result;
    }
    return this.prisma.candidateDuplicateCase.update({ where: { id: caseId, version: input.version }, data: { state: input.action === 'KEEP_SEPARATE' ? 'KEEP_SEPARATE' : 'REVIEWED', resolutionReason: input.reason, targetCandidateId: input.targetCandidateId, resolvedById: context.actorId, resolvedAt: new Date(), version: { increment: 1 } } });
  }

  private assertScope(candidate: { ownerId: string; teamId: string | null }, context: MergeContext): void {
    if (candidate.ownerId !== context.actorId && (!context.teamId || candidate.teamId !== context.teamId)) throw new CandidateDomainError('FORBIDDEN', 'candidate is outside actor scope', 403);
  }
}
