import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from './guards/policy.guard.js';
import { SessionGuard } from './guards/session.guard.js';
import { ROLE_ACTION_SCOPES } from '../domain/permission.registry.js';

function roleSlug(code: string): string { return code.toLowerCase().replace(/_/g, '-'); }
function roleCode(value: string): string { return value.replace(/-/g, '_').toUpperCase(); }
function teamId(value: string | undefined, fallback: string | null): string | null {
  if (!value) return fallback;
  return /^[0-9a-f-]{36}$/i.test(value) ? value : fallback;
}

@Controller('admin')
@UseGuards(SessionGuard, PolicyGuard)
export class AdminCompatibilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @RequirePermission('iam.configure')
  async users(@Query('query') query?: string) {
    const users = await this.prisma.user.findMany({
      where: query?.trim() ? { OR: [{ displayName: { contains: query.trim(), mode: 'insensitive' } }, { email: { contains: query.trim(), mode: 'insensitive' } }] } : undefined,
      include: { team: true, userRoles: { include: { role: true } }, sessions: { orderBy: { lastSeenAt: 'desc' }, take: 1 } },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }], take: 200,
    });
    return { items: users.map((user) => ({
      id: user.id, displayName: user.displayName, email: user.email,
      team: { id: user.team?.id ?? 'unassigned', name: user.team?.name ?? 'Unassigned' },
      roleIds: user.userRoles.map((entry) => roleSlug(entry.role.code)), status: user.status,
      lastActiveAt: user.sessions[0]?.lastSeenAt?.toISOString() ?? null, version: user.version,
    })) };
  }

  @Post('users')
  @UseGuards(CsrfGuard)
  @RequirePermission('iam.configure')
  async invite(@Body() body: { displayName: string; email: string; teamId: string; roleIds: string[] }) {
    const fallbackTeam = await this.prisma.team.findFirst({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } });
    const existing = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw Object.assign(new Error('USER_ALREADY_EXISTS'), { code: 'USER_ALREADY_EXISTS', statusCode: 409, messageKey: 'errors.conflict' });
    const user = await this.prisma.user.create({ data: {
      displayName: body.displayName.trim(), email: body.email.trim().toLowerCase(), status: 'INVITED', teamId: teamId(body.teamId, fallbackTeam?.id ?? null),
      userRoles: { create: (body.roleIds ?? []).map((id) => ({ role: { connect: { code: roleCode(id) } }, scope: 'TEAM' })) },
    }, include: { team: true, userRoles: { include: { role: true } } } });
    return { id: user.id, displayName: user.displayName, email: user.email, team: { id: user.team?.id ?? 'unassigned', name: user.team?.name ?? 'Unassigned' }, roleIds: user.userRoles.map((entry) => roleSlug(entry.role.code)), status: user.status, lastActiveAt: null, version: user.version };
  }

  @Patch('users/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('iam.configure')
  async updateUser(@Param('id') id: string, @Body() body: { teamId: string; roleIds: string[]; status: 'ACTIVE' | 'LOCKED' | 'INVITED'; version: number }) {
    const current = await this.prisma.user.findUnique({ where: { id }, include: { team: true } });
    if (!current) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND', statusCode: 404, messageKey: 'errors.notFound' });
    if (current.version !== body.version) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT', statusCode: 409, messageKey: 'errors.conflict' });
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.userRole.deleteMany({ where: { userId: id } });
      return transaction.user.update({ where: { id, version: body.version }, data: { teamId: teamId(body.teamId, current.teamId), status: body.status, version: { increment: 1 }, userRoles: { create: (body.roleIds ?? []).map((roleId) => ({ role: { connect: { code: roleCode(roleId) } }, scope: 'TEAM' })) } }, include: { team: true, userRoles: { include: { role: true } } } });
    });
    return { id: updated.id, displayName: updated.displayName, email: updated.email, team: { id: updated.team?.id ?? 'unassigned', name: updated.team?.name ?? 'Unassigned' }, roleIds: updated.userRoles.map((entry) => roleSlug(entry.role.code)), status: updated.status, lastActiveAt: null, version: updated.version };
  }

  @Get('roles')
  @RequirePermission('iam.configure')
  async roles() {
    const roles = await this.prisma.role.findMany({ orderBy: { code: 'asc' } });
    return { items: roles.map((role) => {
      const actions = Object.keys(ROLE_ACTION_SCOPES[role.code] ?? {});
      const scopes = Array.from(new Set(actions.map((action) => ROLE_ACTION_SCOPES[role.code]?.[action as keyof typeof ROLE_ACTION_SCOPES[typeof role.code]]).filter(Boolean))) as string[];
      return { id: roleSlug(role.code), name: role.code, description: role.description ?? '', actions, scopes: scopes.length ? scopes : ['TEAM'], sensitivities: ['NORMAL'], permissionRules: actions.map((action) => ({ action, scope: ROLE_ACTION_SCOPES[role.code]?.[action as keyof typeof ROLE_ACTION_SCOPES[typeof role.code]] ?? 'TEAM', sensitivities: ['NORMAL'], approvalRequired: false, reasonRequired: false })), version: 1 };
    }) };
  }

  @Patch('roles/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('iam.configure')
  async updateRole(@Param('id') id: string, @Body() body: { actions: string[]; scopes: string[]; sensitivities: string[]; permissionRules: unknown[]; version: number }) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode(id) } });
    if (!role) throw Object.assign(new Error('ROLE_NOT_FOUND'), { code: 'ROLE_NOT_FOUND', statusCode: 404, messageKey: 'errors.notFound' });
    return { id: roleSlug(role.code), name: role.code, description: role.description ?? '', actions: body.actions ?? [], scopes: body.scopes ?? ['TEAM'], sensitivities: body.sensitivities ?? ['NORMAL'], permissionRules: body.permissionRules ?? [], version: body.version + 1 };
  }

  @Get('templates')
  @RequirePermission('catalog.configure')
  async templates(@Query('type') type?: 'JOURNEY' | 'EMAIL') {
    const [journeys, emails] = await Promise.all([
      type === 'EMAIL' ? [] : this.prisma.supplyJourneyTemplateVersion.findMany({ include: { template: true, milestones: { orderBy: { sequence: 'asc' } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }),
      type === 'JOURNEY' ? [] : this.prisma.interviewQuestionTemplateVersion.findMany({ include: { template: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }),
    ]);
    return { items: [...journeys.map((row) => ({ id: `journey:${row.id}`, type: 'JOURNEY', name: row.template.name, version: `v${row.version}`, status: row.status, usedByCount: 0, updatedAt: row.updatedAt.toISOString(), previewText: row.template.name, subject: '', body: '', variables: [], milestones: row.milestones.map((milestone) => milestone.name) })), ...emails.map((row) => {
      const rawPayload = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      const payload = (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload) ? rawPayload : {}) as Record<string, unknown>;
      return { id: `email:${row.id}`, type: 'EMAIL', name: row.template.name, version: `v${row.version}`, status: row.status, usedByCount: 0, updatedAt: row.updatedAt.toISOString(), previewText: String(payload.previewText ?? row.template.name), subject: String(payload.subject ?? ''), body: String(payload.body ?? ''), variables: Array.isArray(payload.variables) ? payload.variables.filter((value): value is string => typeof value === 'string') : [], milestones: [] };
    })] };
  }

  @Post('templates')
  @UseGuards(CsrfGuard)
  @RequirePermission('catalog.configure')
  async createTemplate(@Body() body: { type: 'JOURNEY' | 'EMAIL'; name: string; previewText: string; subject?: string; body?: string; variables?: string[]; milestones?: string[] }) {
    const code = `${body.type}_${body.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`.slice(0, 72);
    if (body.type === 'JOURNEY') {
      const template = await this.prisma.supplyJourneyTemplate.upsert({ where: { code }, create: { code, name: body.name.trim() }, update: { name: body.name.trim() } });
      const latest = await this.prisma.supplyJourneyTemplateVersion.findFirst({ where: { templateId: template.id }, orderBy: { version: 'desc' } });
      const version = (latest?.version ?? 0) + 1;
      const created = await this.prisma.supplyJourneyTemplateVersion.create({ data: { templateId: template.id, version, status: 'DRAFT', residenceContext: 'IN_JAPAN', caseType: 'OTHER', checksum: `sha256:${'0'.repeat(64)}`, milestones: { create: (body.milestones ?? []).map((name, index) => ({ code: `M${index + 1}`, name, sequence: index + 1, ownerRule: {}, checklistSchema: {}, evidenceRequirements: [] })) } }, include: { template: true, milestones: true } });
      return { id: `journey:${created.id}`, type: 'JOURNEY', name: created.template.name, version: `v${created.version}`, status: created.status, usedByCount: 0, updatedAt: created.updatedAt.toISOString(), previewText: body.previewText, subject: '', body: '', variables: body.variables ?? [], milestones: created.milestones.map((milestone) => milestone.name) };
    }
    const template = await this.prisma.interviewQuestionTemplate.upsert({ where: { code }, create: { code, name: body.name.trim() }, update: { name: body.name.trim() } });
    const latest = await this.prisma.interviewQuestionTemplateVersion.findFirst({ where: { templateId: template.id }, orderBy: { version: 'desc' } });
    const created = await this.prisma.interviewQuestionTemplateVersion.create({ data: { templateId: template.id, version: (latest?.version ?? 0) + 1, status: 'DRAFT', questions: [{ type: 'EMAIL', previewText: body.previewText, subject: body.subject ?? '', body: body.body ?? body.previewText, variables: body.variables ?? [] }] }, include: { template: true } });
    return { id: `email:${created.id}`, type: 'EMAIL', name: created.template.name, version: `v${created.version}`, status: created.status, usedByCount: 0, updatedAt: created.updatedAt.toISOString(), previewText: body.previewText, subject: body.subject ?? '', body: body.body ?? body.previewText, variables: body.variables ?? [], milestones: [] };
  }

  @Post('templates/:id/retire')
  @UseGuards(CsrfGuard)
  @RequirePermission('catalog.configure')
  async retireTemplate(@Param('id') id: string) {
    const [type, versionId] = id.split(':', 2);
    if (type === 'journey') return this.prisma.supplyJourneyTemplateVersion.update({ where: { id: versionId }, data: { status: 'RETIRED' } }).then((row) => ({ id, type: 'JOURNEY', version: `v${row.version}`, status: row.status, updatedAt: row.updatedAt.toISOString() }));
    return this.prisma.interviewQuestionTemplateVersion.update({ where: { id: versionId }, data: { status: 'RETIRED' } }).then((row) => ({ id, type: 'EMAIL', version: `v${row.version}`, status: row.status, updatedAt: row.updatedAt.toISOString() }));
  }

  @Get('mailbox')
  @RequirePermission('catalog.configure')
  async mailbox() { return this.mailboxView(await this.prisma.mailbox.findFirst({ orderBy: { id: 'asc' } })); }

  @Patch('mailbox')
  @UseGuards(CsrfGuard)
  @RequirePermission('catalog.configure')
  async updateMailbox(@Body() body: { senderName: string; adapter: 'MICROSOFT_GRAPH' | 'GMAIL_API' | 'SMTP_IMAP'; maxAttachmentBytes: number; signature?: string; receiveFolder?: string; sentFolder?: string; retryLimit?: number; alertAddress?: string }) {
    const current = await this.prisma.mailbox.findFirst({ orderBy: { id: 'asc' } });
    const row = current ? await this.prisma.mailbox.update({ where: { id: current.id }, data: { displayName: body.senderName.trim(), provider: body.adapter } }) : await this.prisma.mailbox.create({ data: { address: 'cms@local.test', displayName: body.senderName.trim(), provider: body.adapter, status: 'NOT_CONFIGURED' } });
    return this.mailboxView(row, body);
  }

  @Get('audit')
  @RequirePermission('audit.view')
  async audit(@Query('actorId') actorId?: string, @Query('resourceId') resourceId?: string, @Query('action') action?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const rows = await this.prisma.auditEvent.findMany({ where: { ...(actorId ? { actorUserId: actorId } : {}), ...(resourceId ? { entityId: resourceId } : {}), ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}), ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}) }, include: { actorUser: true }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 200 });
    return { items: rows.map((row) => ({ id: row.id, occurredAt: row.occurredAt.toISOString(), actor: { id: row.actorUserId ?? 'system', name: row.actorUser?.displayName ?? 'System' }, action: row.action, resourceType: row.entityType, resourceId: row.entityId ?? '', source: 'API', summary: row.action, metadata: row.metadataJson })) };
  }

  private mailboxView(row: { address: string; displayName: string; provider: string; status: string; updatedAt: Date } | null, patch: Partial<{ senderName: string; adapter: string; maxAttachmentBytes: number; signature: string; receiveFolder: string; sentFolder: string; retryLimit: number; alertAddress: string }> = {}) {
    const adapter = (patch.adapter ?? row?.provider ?? 'SMTP_IMAP') as 'MICROSOFT_GRAPH' | 'GMAIL_API' | 'SMTP_IMAP';
    return { address: row?.address ?? 'cms@local.test', senderName: patch.senderName ?? row?.displayName ?? 'Candidate Supply CMS', adapter, maxAttachmentBytes: patch.maxAttachmentBytes ?? 10 * 1024 * 1024, health: row?.status === 'HEALTHY' ? 'HEALTHY' : row?.status === 'DEGRADED' ? 'DEGRADED' : 'DISCONNECTED', lastCheckedAt: (row?.updatedAt ?? new Date()).toISOString(), credentialConfigured: false, signature: patch.signature ?? '', receiveFolder: patch.receiveFolder ?? 'Inbox', sentFolder: patch.sentFolder ?? 'Sent', retryLimit: patch.retryLimit ?? 3, alertAddress: patch.alertAddress ?? '' };
  }
}
