import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { CandidateService } from '../application/candidate.service.js';
import type { CandidateEntity, CandidateListQuery } from '../domain/candidate.types.js';
import { maskEmail, maskPhone } from '../domain/candidate.rules.js';
import { ArchiveCandidateDto, CreateCandidateDto, CreateOccupationProfileDto, UpdateCandidateDto } from './candidates.dto.js';

@Controller('candidates')
@UseGuards(SessionGuard, PolicyGuard)
export class CandidatesController {
  constructor(private readonly candidates: CandidateService) {}

  @Get()
  @RequirePermission('candidate.view')
  async list(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) {
    const result = await this.candidates.list(this.listQuery(query, request));
    return { data: { items: result.items.map(serializeCandidate) }, page: result.page, requestId: this.requestId() };
  }

  @Get('search-for-order')
  @RequirePermission('candidate.view')
  async searchForOrder(@Query() query: Record<string, string | undefined>, @Req() request: AuthenticatedRequest) {
    if (!query.orderId?.trim()) throw Object.assign(new Error('ORDER_ID_REQUIRED'), { code: 'ORDER_ID_REQUIRED', statusCode: 422 });
    const access = this.scope(request);
    const items = await this.candidates.searchForOrder({ orderId: query.orderId, query: query.query, industry: query.industrySectorId ?? query.industry, occupation: query.occupationId ?? query.occupation, skill: query.skill, japaneseLevel: query.japaneseLevel, readiness: query.readinessStatus ?? query.readiness, hasActiveJourney: query.hasActiveJourney, ownerId: access.ownerId, teamId: access.teamId, scope: access.level });
    return { data: { items }, page: { hasMore: false, nextCursor: null }, requestId: this.requestId() };
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.create')
  async create(@Body() body: CreateCandidateDto, @Req() request: AuthenticatedRequest) {
    return serializeCandidate(await this.candidates.create(body, this.context(request)));
  }

  @Get(':id')
  @RequirePermission('candidate.view')
  async get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return serializeDetail(await this.candidates.get(id, this.scope(request)));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.update_basic')
  async update(@Param('id') id: string, @Body() body: UpdateCandidateDto, @Req() request: AuthenticatedRequest) {
    return serializeDetail(await this.candidates.update(id, body, body.version, this.context(request), this.scope(request)));
  }

  @Post(':id/occupation-profiles')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.update_basic')
  async addOccupationProfile(@Param('id') id: string, @Body() body: CreateOccupationProfileDto, @Req() request: AuthenticatedRequest) {
    return await this.candidates.addOccupationProfile(id, { ...body, attributes: body.attributes ?? {} }, this.context(request), this.scope(request));
  }

  @Post(':id/archive')
  @UseGuards(CsrfGuard)
  @RequirePermission('candidate.archive')
  async archive(@Param('id') id: string, @Body() body: ArchiveCandidateDto, @Req() request: AuthenticatedRequest) {
    return serializeDetail(await this.candidates.archive(id, body.version, body.reason, this.context(request, body.approvalId), this.scope(request)));
  }

  private listQuery(query: Record<string, string | undefined>, request: AuthenticatedRequest): CandidateListQuery {
    const allowed = new Set(['query', 'view', 'industrySectorId', 'readinessStatus', 'contactabilityStatus', 'occupationId', 'skill', 'desiredLocation', 'source', 'recordStatus', 'experience', 'cursor', 'limit', 'industry', 'readiness', 'contactability', 'occupation']);
    const unknown = Object.keys(query).filter((key) => !allowed.has(key));
    if (unknown.length) throw Object.assign(new Error('UNSUPPORTED_CANDIDATE_FILTER'), { code: 'UNSUPPORTED_CANDIDATE_FILTER', statusCode: 422 });
    const access = this.scope(request);
    return {
      query: query.query, view: query.view, industrySectorId: query.industrySectorId ?? query.industry, readinessStatus: (query.readinessStatus ?? query.readiness) as never,
      contactabilityStatus: (query.contactabilityStatus ?? query.contactability) as never, occupationId: query.occupationId ?? query.occupation, skill: query.skill, desiredLocation: query.desiredLocation,
      source: query.source, recordStatus: query.recordStatus as never, experience: query.experience, cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined, ownerId: request.auth!.userId, teamId: request.auth!.teamId, scope: access.level,
    };
  }

  private context(request: AuthenticatedRequest, approvalId?: string) {
    const context = getRequestContext();
    return { actorId: request.auth!.userId, teamId: request.auth!.teamId, requestId: context?.requestId ?? 'unknown-request', correlationId: context?.correlationId ?? 'unknown-correlation', ...(approvalId ? { approvalId } : {}) };
  }

  private scope(request: AuthenticatedRequest): { ownerId: string; teamId?: string; level: 'SELF' | 'TEAM' } {
    return { ownerId: request.auth!.userId, teamId: request.auth!.teamId, level: request.auth?.roles.some((role) => role.scope === 'TEAM' || role.scope === 'DEPARTMENT' || role.scope === 'COMPANY') ? 'TEAM' : 'SELF' };
  }

  private requestId(): string { return getRequestContext()?.requestId ?? 'unknown-request'; }
}

function serializeCandidate(candidate: CandidateEntity) {
  const profile = candidate.profiles.find((entry) => entry.status !== 'ARCHIVED') ?? candidate.profiles[0];
  return {
    id: candidate.id, code: candidate.code, name: candidate.name, industryLabels: candidate.industryLabels, occupation: candidate.occupation, source: candidate.source,
    japaneseLevel: candidate.japaneseLevel, recordStatus: candidate.recordStatus, readinessStatus: candidate.readinessStatus,
    contactabilityStatus: candidate.contactabilityStatus, operationalPhase: candidate.operationalPhase ?? 'POTENTIAL', owner: { id: candidate.ownerId, name: candidate.ownerName ?? candidate.ownerId },
    lastActivityAt: candidate.updatedAt.toISOString(), nextAction: candidate.nextAction ?? 'REVIEW_PROFILE', applicationCount: candidate.applicationCount ?? 0, hasActiveJourney: candidate.hasActiveJourney ?? false,
    isPossibleDuplicate: candidate.isPossibleDuplicate ?? false, version: candidate.version, emailMasked: maskEmail(candidate.email), phoneMasked: maskPhone(candidate.phone),
    skills: candidate.skills ?? profile?.skills ?? [], yearsExperience: candidate.yearsExperience ?? profile?.yearsExperience ?? 0, desiredLocation: candidate.desiredLocation ?? profile?.desiredLocation ?? null,
    missingDocumentCount: candidate.missingDocumentCount ?? 0,
    ...(profile ? { profile: { industryLabel: profile.industryLabel, occupation: profile.occupation, yearsExperience: profile.yearsExperience, skills: profile.skills } } : {}),
  };
}

function serializeDetail(candidate: CandidateEntity) {
  return {
    ...serializeCandidate(candidate),
    occupationProfiles: candidate.profiles.map((profile) => ({ industryLabel: profile.industryLabel, occupation: profile.occupation, yearsExperience: profile.yearsExperience, skills: profile.skills, status: profile.status })),
    email: candidate.email ?? null, phone: candidate.phone ?? null, passportNumber: candidate.passportNumber ?? null, address: candidate.address ?? null,
    applications: (candidate.applications ?? []).map((application) => ({ ...application, candidate: { id: candidate.id, code: candidate.code, name: candidate.name } })),
    journeys: candidate.journeys ?? [], emailCount: candidate.emailCount ?? 0, files: candidate.files ?? [], notes: candidate.notes ?? [], history: candidate.history ?? [],
  };
}
